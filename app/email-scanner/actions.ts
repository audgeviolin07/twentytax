"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { apiConfig, isApiConfigured, API_ERROR_MESSAGES } from "@/utils/api-config"
import { createServerComponentClient } from "@/utils/supabase-server"
import { saveEmails, saveTaxDocument } from "./db-actions"
import { google } from "googleapis"

type EmailProvider = "gmail"
type DocumentType = "W2" | "1099-MISC" | "1099-NEC" | "1099-K" | "1099-INT" | "1099-DIV" | "Other"

interface EmailDocument {
  id: string
  type: DocumentType
  sender: string
  date: string
  subject: string
  preview: string
}

export interface EmailData {
  id: string
  from_address: string
  subject: string
  date: string
  preview: string
  read: boolean
  starred: boolean
  has_tax_document: boolean
  document_type: string | null
}

// OAuth configuration for different providers
const oauthConfig = {
  clientId: process.env.GMAIL_CLIENT_ID || "",
  clientSecret: process.env.GMAIL_CLIENT_SECRET || "",
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback/gmail`,
  scope: ["https://www.googleapis.com/auth/gmail.readonly"],
}

// Function to generate OAuth URL for email provider
export async function connectEmailProvider(email: string, provider: EmailProvider) {
  try {
    // Add this console.log statement
    console.log('Environment Variables Debug:', {
      direct_env: {
        GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
      },
      oauthConfig: oauthConfig,
      process_env_keys: Object.keys(process.env).filter(key => 
        key.includes('GMAIL') || key.includes('NEXT_PUBLIC')
      )
    });

    // Check if OAuth credentials are configured
    if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
      return {
        error: `OAuth credentials for Gmail are not configured.`,
      }
    }

    // Generate state parameter to prevent CSRF
    const state = Buffer.from(
      JSON.stringify({
        email,
        provider,
        timestamp: Date.now(),
      }),
    ).toString("base64")

    // Generate the OAuth URL for Gmail
    const oauth2Client = new google.auth.OAuth2(oauthConfig.clientId, oauthConfig.clientSecret, oauthConfig.redirectUri)
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: oauthConfig.scope,
      state,
    })

    // Store the state in the database for verification during callback
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      await supabase.from("email_auth_states").insert({
        user_id: session.user.id,
        state,
        provider,
        email,
        created_at: new Date().toISOString(),
      })
    }

    return { authUrl }
  } catch (error: any) {
    console.error("Error generating OAuth URL:", error)
    return {
      error: error.message || "Failed to initiate email authentication",
    }
  }
}

// Function to fetch emails from Gmail
async function fetchGmailEmails(accessToken: string, refreshToken: string): Promise<EmailData[]> {
  try {
    const oauth2Client = new google.auth.OAuth2(oauthConfig.clientId, oauthConfig.clientSecret, oauthConfig.redirectUri)

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    // Get list of messages
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      q: "newer_than:6m", // Get emails from the last 6 months
    })

    if (!response.data.messages || response.data.messages.length === 0) {
      return []
    }

    // Fetch details for each message
    const emails = await Promise.all(
      response.data.messages.map(async (message) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: message.id!,
        })

        const headers = msg.data.payload?.headers || []
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
        const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
        const date = headers.find((h) => h.name === "Date")?.value || new Date().toISOString()

        // Get snippet or body
        const snippet = msg.data.snippet || ""

        return {
          id: msg.data.id!,
          from_address: from,
          subject,
          date,
          preview: snippet,
          read: !(msg.data.labelIds || []).includes("UNREAD"),
          starred: (msg.data.labelIds || []).includes("STARRED"),
          has_tax_document: false, // Will be updated after scanning
          document_type: null,
        }
      }),
    )

    return emails
  } catch (error) {
    console.error("Error fetching Gmail emails:", error)
    throw error
  }
}

export async function fetchEmails(email: string, provider: EmailProvider): Promise<EmailData[]> {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    // Get the current user and their email tokens
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error("User not authenticated")
    }

    // Get the user's email tokens
    const { data: tokens } = await supabase
      .from("email_tokens")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("provider", provider)
      .eq("email", email)
      .single()

    if (!tokens || !tokens.access_token) {
      throw new Error("Email not connected. Please connect your email first.")
    }

    // Fetch emails from Gmail
    return await fetchGmailEmails(tokens.access_token, tokens.refresh_token)
  } catch (error: any) {
    console.error("Error fetching emails:", error)
    throw new Error(error.message || "Failed to fetch emails")
  }
}

// Function to scan emails for tax documents
export async function scanEmails(email: string, provider: EmailProvider): Promise<EmailDocument[]> {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    // Get the current user
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error("User not authenticated")
    }

    // Get emails from the database
    const { data: emails } = await supabase.from("emails").select("*").eq("user_id", session.user.id)

    if (!emails || emails.length === 0) {
      throw new Error("No emails found. Please connect your email first.")
    }

    // Use AI to identify tax documents
    const emailsJson = JSON.stringify(
      emails.map((e) => ({
        id: e.id,
        from: e.from_address,
        subject: e.subject,
        date: e.date,
        preview: e.preview,
      })),
    )

    const { text } = await generateText({
      model: openai(apiConfig.openaiModel),
      prompt: `You are an expert at identifying tax documents in emails. 
      
      Analyze these emails and identify any that likely contain tax documents like W2s, 1099s, etc.
      
      Emails:
      ${emailsJson}
      
      For each email that likely contains a tax document, provide:
      1. The email ID
      2. The type of tax document (W2, 1099-MISC, 1099-NEC, 1099-K, 1099-INT, 1099-DIV, or Other)
      3. The sender
      4. The date
      5. The subject
      6. The preview text
      
      Format your response as a JSON array of objects with these fields:
      [
        {
          "id": "string",
          "type": "DocumentType",
          "sender": "email@example.com",
          "date": "YYYY-MM-DD",
          "subject": "Subject line",
          "preview": "Preview text"
        }
      ]
      
      Return ONLY the JSON array with no markdown formatting, no code blocks, and no additional text.`,
    })

    // Clean and parse the response
    let cleanedText = text.trim()
    if (cleanedText.startsWith("```") && cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1, cleanedText.lastIndexOf("```")).trim()
      if (cleanedText.startsWith("json") || cleanedText.startsWith("JSON")) {
        cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1).trim()
      }
    }

    const taxDocuments = JSON.parse(cleanedText)

    // Update the database to mark these emails as having tax documents
    for (const doc of taxDocuments) {
      await supabase
        .from("emails")
        .update({
          has_tax_document: true,
          document_type: doc.type,
        })
        .eq("id", doc.id)
    }

    return taxDocuments
  } catch (error: any) {
    console.error("Error scanning emails:", error)
    throw new Error(error.message || "Failed to scan emails")
  }
}

// Function to process uploaded tax documents
export async function processTaxDocuments(formData: FormData) {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    // Get the current user
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error("User not authenticated")
    }

    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      throw new Error("No files uploaded")
    }

    // Process each file
    const results = await Promise.all(
      files.map(async (file) => {
        // Convert file to base64 for processing
        const fileBuffer = await file.arrayBuffer()
        const fileBase64 = Buffer.from(fileBuffer).toString("base64")

        // Use AI to extract information from the document
        const { text } = await generateText({
          model: openai(apiConfig.openaiModel),
          prompt: `You are a tax document analyzer. Extract key information from this tax document.
          
          The document is named "${file.name}" and is of type "${file.type}".
          
          Extract the following information:
          - Document type (W2, 1099-MISC, 1099-NEC, 1099-K, 1099-INT, 1099-DIV, or Other)
          - Issuer/Sender name
          - Tax year
          - Key financial figures (income, withholding, etc.)
          
          Format your response as a JSON object with these fields:
          {
            "documentType": "string",
            "issuer": "string",
            "taxYear": "string",
            "financialData": {
              "key1": "value1",
              "key2": "value2"
            }
          }
          
          Return ONLY the JSON object with no markdown formatting, no code blocks, and no additional text.`,
        })

        // Clean and parse the response
        let cleanedText = text.trim()
        if (cleanedText.startsWith("```") && cleanedText.endsWith("```")) {
          cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1, cleanedText.lastIndexOf("```")).trim()
          if (cleanedText.startsWith("json") || cleanedText.startsWith("JSON")) {
            cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1).trim()
          }
        }

        const extractedData = JSON.parse(cleanedText)

        // Save the tax document to the database
        await saveTaxDocument(session.user.id, {
          document_type: extractedData.documentType,
          issuer: extractedData.issuer,
          tax_year: extractedData.taxYear,
          financial_data: extractedData.financialData,
        })

        return {
          fileName: file.name,
          fileType: file.type,
          extractedData,
        }
      }),
    )

    return results
  } catch (error: any) {
    console.error("Error processing tax documents:", error)

    // Handle specific error types
    if (error.message.includes("rate limit")) {
      throw new Error(API_ERROR_MESSAGES.rateLimitExceeded)
    } else if (error.message.includes("API key")) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    } else if (error.message.includes("connect")) {
      throw new Error(API_ERROR_MESSAGES.openaiApiError)
    }

    throw new Error(error.message || API_ERROR_MESSAGES.generalError)
  }
}

// Function to analyze pasted email content
export async function analyzeEmailContent(emailContent: string) {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    // Get the current user
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error("User not authenticated")
    }

    if (!emailContent.trim()) {
      throw new Error("No email content provided")
    }

    // Use AI to extract information from the email content
    const { text } = await generateText({
      model: openai(apiConfig.openaiModel),
      prompt: `You are a tax document analyzer. Extract key information from this email content that appears to contain tax information.
      
      Here is the email content:
      ${emailContent}
      
      Extract the following information:
      - Document type (W2, 1099-MISC, 1099-NEC, 1099-K, 1099-INT, 1099-DIV, or Other)
      - Issuer/Sender name
      - Tax year
      - Key financial figures (income, withholding, etc.)
      
      Format your response as a JSON object with these fields:
      {
        "documentType": "string",
        "issuer": "string",
        "taxYear": "string",
        "financialData": {
          "key1": "value1",
          "key2": "value2"
        }
      }
      
      If the email doesn't appear to contain tax document information, make your best guess about what type of document it might be and extract any relevant financial information.
      
      Return ONLY the JSON object with no markdown formatting, no code blocks, and no additional text.`,
    })

    // Clean and parse the response
    let cleanedText = text.trim()
    if (cleanedText.startsWith("```") && cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1, cleanedText.lastIndexOf("```")).trim()
      if (cleanedText.startsWith("json") || cleanedText.startsWith("JSON")) {
        cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1).trim()
      }
    }

    const extractedData = JSON.parse(cleanedText)

    // Save the tax document to the database
    await saveTaxDocument(session.user.id, {
      document_type: extractedData.documentType,
      issuer: extractedData.issuer,
      tax_year: extractedData.taxYear,
      financial_data: extractedData.financialData,
    })

    return {
      fileName: "Pasted Email Content",
      fileType: "text/plain",
      extractedData,
    }
  } catch (error: any) {
    console.error("Error analyzing email content:", error)

    // Handle specific error types
    if (error.message.includes("rate limit")) {
      throw new Error(API_ERROR_MESSAGES.rateLimitExceeded)
    } else if (error.message.includes("API key")) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    } else if (error.message.includes("connect")) {
      throw new Error(API_ERROR_MESSAGES.openaiApiError)
    }

    throw new Error(error.message || "Failed to analyze email content")
  }
}
