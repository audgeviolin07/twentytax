"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { extractDataFromPDF, extractDataFromCSV } from "@/utils/pdf-parser"
import { apiConfig, isApiConfigured, API_ERROR_MESSAGES } from "@/utils/api-config"

interface ClassifiedExpense {
  id: string
  date: string
  description: string
  amount: number
  category: string
  deductible: boolean
  confidence: number
}

interface ClassificationResult {
  expenses: ClassifiedExpense[]
  summary: {
    totalExpenses: number
    totalDeductible: number
    categoryCounts: Record<string, number>
  }
}

export async function classifyExpenses(formData: FormData): Promise<ClassificationResult> {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    const file = formData.get("file") as File

    if (!file) {
      throw new Error("No file provided")
    }

    // Extract file content based on file type
    const fileBuffer = await file.arrayBuffer()
    const fileContent = Buffer.from(fileBuffer)

    // Extract transactions from the file
    let transactions = []

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // For PDF files
      const base64Content = fileContent.toString("base64")
      transactions = await extractDataFromPDF(base64Content)
    } else if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) {
      // For CSV files
      const textContent = fileContent.toString("utf-8")
      transactions = await extractDataFromCSV(textContent)
    } else if (
      file.type.includes("excel") ||
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls")
    ) {
      // For Excel files, we'd use a library like xlsx in a real implementation
      // For this demo, we'll use AI to simulate Excel parsing
      const base64Content = fileContent.toString("base64")

      const { text } = await generateText({
        model: openai(apiConfig.openaiModel),
        prompt: `You are an Excel parser specialized in financial documents.
        Simulate parsing an Excel file with transaction data.
        
        The file is named "${file.name}".
        
        Generate a realistic set of 15-20 transactions that might be found in this Excel file.
        Each transaction should have:
        - date: transaction date in YYYY-MM-DD format
        - description: merchant name or transaction description
        - amount: transaction amount as a number
        
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

      transactions = JSON.parse(cleanedText)
    } else {
      throw new Error("Unsupported file type")
    }

    // Use AI to classify the transactions
    const { text } = await generateText({
      model: openai(apiConfig.openaiModel),
      prompt: `You are a tax expert specializing in expense classification.
      
      Classify these transactions for tax purposes:
      ${JSON.stringify(transactions, null, 2)}
      
      For each transaction:
      1. Assign a business category (Business Services, Office Supplies, Travel, Meals, Utilities, Rent, Software, Hardware, Marketing, Other)
      2. Determine if it's tax deductible (true/false)
      3. Assign a confidence score (0.0-1.0) for your classification
      4. Assign a unique ID
      
      Also calculate:
      - Total expenses amount (sum of all transaction amounts)
      - Total deductible expenses amount (sum of deductible transaction amounts)
      - Count of expenses by category
      
      Format your response as a JSON object with this structure:
      {
        "expenses": [
          {
            "id": "string",
            "date": "YYYY-MM-DD",
            "description": "string",
            "amount": number,
            "category": "string",
            "deductible": boolean,
            "confidence": number
          }
        ],
        "summary": {
          "totalExpenses": number,
          "totalDeductible": number,
          "categoryCounts": {
            "category1": number,
            "category2": number
          }
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

    return JSON.parse(cleanedText)
  } catch (error: any) {
    console.error("Error classifying expenses:", error)

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
