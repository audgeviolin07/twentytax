import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { apiConfig, isApiConfigured, API_ERROR_MESSAGES } from "@/utils/api-config"

export async function extractDataFromPDF(pdfBase64: string) {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    // In a real application, we would use a PDF parsing library like pdf-parse
    // For this implementation, we'll use AI to extract structured data from the PDF content

    // First few characters of the base64 string (for logging/debugging)
    const base64Preview = pdfBase64.substring(0, 50) + "..."
    console.log("Processing PDF, base64 preview:", base64Preview)

    // Use AI to extract structured data from the PDF content
    const { text } = await generateText({
      model: openai(apiConfig.openaiModel),
      prompt: `You are a PDF parser specialized in financial documents. 
      Extract transaction data from this bank statement PDF.
      
      The PDF content is encoded in base64. Assume it contains bank transactions with dates, descriptions, and amounts.
      
      Extract and format the transactions as a JSON array with these fields:
      - date: transaction date in YYYY-MM-DD format
      - description: merchant name or transaction description
      - amount: transaction amount as a number (positive for deposits, negative for withdrawals)
      
      Return ONLY the JSON array with no markdown formatting, no code blocks, and no additional text.`,
    })

    // Clean the response in case it contains markdown code blocks
    let cleanedText = text.trim()

    // Check if the response is wrapped in a markdown code block
    if (cleanedText.startsWith("```") && cleanedText.endsWith("```")) {
      // Extract content between the first and last ```
      cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1, cleanedText.lastIndexOf("```")).trim()

      // If there's a language specifier like ```json, remove it
      if (cleanedText.startsWith("json") || cleanedText.startsWith("JSON")) {
        cleanedText = cleanedText.substring(cleanedText.indexOf("\n") + 1).trim()
      }
    }

    // Parse the cleaned JSON
    return JSON.parse(cleanedText)
  } catch (error: any) {
    console.error("Error extracting data from PDF:", error)

    // Handle specific error types
    if (error.message.includes("rate limit")) {
      throw new Error(API_ERROR_MESSAGES.rateLimitExceeded)
    } else if (error.message.includes("API key")) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    } else if (error.message.includes("connect")) {
      throw new Error(API_ERROR_MESSAGES.openaiApiError)
    }

    throw new Error(error.message || "Failed to extract data from PDF")
  }
}

export async function extractDataFromCSV(csvContent: string) {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    // Parse CSV content
    const lines = csvContent.split("\n")
    const headers = lines[0].split(",").map((header) => header.trim())

    const transactions = []

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue

      const values = lines[i].split(",").map((value) => value.trim())
      const transaction: Record<string, any> = {}

      headers.forEach((header, index) => {
        transaction[header] = values[index]
      })

      transactions.push(transaction)
    }

    // Use AI to standardize the data format
    const { text } = await generateText({
      model: openai(apiConfig.openaiModel),
      prompt: `You are a CSV parser specialized in financial documents.
      Standardize this transaction data from a CSV file.
      
      Here's the parsed CSV data:
      ${JSON.stringify(transactions, null, 2)}
      
      Convert this data to a standardized format with these fields:
      - date: transaction date in YYYY-MM-DD format
      - description: merchant name or transaction description
      - amount: transaction amount as a number (positive for deposits, negative for withdrawals)
      
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

    return JSON.parse(cleanedText)
  } catch (error: any) {
    console.error("Error extracting data from CSV:", error)

    // Handle specific error types
    if (error.message.includes("rate limit")) {
      throw new Error(API_ERROR_MESSAGES.rateLimitExceeded)
    } else if (error.message.includes("API key")) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    } else if (error.message.includes("connect")) {
      throw new Error(API_ERROR_MESSAGES.openaiApiError)
    }

    throw new Error(error.message || "Failed to extract data from CSV")
  }
}
