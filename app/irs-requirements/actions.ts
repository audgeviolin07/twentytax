"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { apiConfig, isApiConfigured, API_ERROR_MESSAGES } from "@/utils/api-config"

export async function checkIrsRequirements(state: string, age: number, income: number, filingStatus: string) {
  try {
    // Check if API is configured
    if (!isApiConfigured()) {
      throw new Error(API_ERROR_MESSAGES.missingApiKey)
    }

    const stateFullName = getStateFullName(state)
    const filingStatusFormatted = formatFilingStatus(filingStatus)

    // Use OpenAI to search for and extract real IRS requirements
    const { text } = await generateText({
      model: openai(apiConfig.openaiModel),
      prompt: `You are a tax expert with access to the latest IRS and state tax authority information.
      
      Research and provide accurate, up-to-date information about tax filing requirements for a person with the following details:
      - Age: ${age}
      - Annual Income: $${income.toLocaleString()}
      - Filing Status: ${filingStatusFormatted}
      - State of Residence: ${stateFullName}
      
      Determine if this person is required to file federal and/or state taxes based on their situation.
      
      Include the following information:
      1. Whether they MUST file taxes (true/false)
      2. A clear explanation of why they must or don't need to file
      3. Required federal tax forms if they need to file (or should file even if not required)
      4. Required state tax forms specific to ${stateFullName} (if applicable)
      5. Federal and state tax rates that would apply to their income level
      6. Important tax filing deadlines they should be aware of
      7. An excerpt from the IRS or ${stateFullName} state tax authority website that contains this information
      8. Include the source URL where this information was found
      
      Format your response as a JSON object with the following structure:
      {
        "mustFile": boolean,
        "filingRequirementReason": "Clear explanation of why they must or don't need to file",
        "requiredFederalForms": ["Form 1", "Form 2"],
        "requiredStateForms": ["Form 1", "Form 2"],
        "taxRates": "Description of tax rates that apply to this person",
        "deadlines": "Important tax filing deadlines",
        "sourceExcerpt": "Direct quote from IRS or state tax authority",
        "sourceUrl": "URL of the source"
      }
      
      Return ONLY the JSON object with no markdown formatting, no code blocks, and no additional text.`,
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
    console.error("Error checking IRS requirements:", error)

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

function getStateFullName(stateCode: string) {
  const states: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
  }

  return states[stateCode] || stateCode
}

function formatFilingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    single: "Single",
    married_joint: "Married Filing Jointly",
    married_separate: "Married Filing Separately",
    head_household: "Head of Household",
    qualifying_widow: "Qualifying Widow(er) with Dependent Child",
  }

  return statusMap[status] || status
}
