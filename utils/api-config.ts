// Retrieve environment variables with fallbacks
export const apiConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o",
}

// Utility function to check if API credentials are configured
export function isApiConfigured(): boolean {
  return !!apiConfig.openaiApiKey
}

// Error messages
export const API_ERROR_MESSAGES = {
  missingApiKey: "OpenAI API key is missing. Please add it to your .env.local file.",
  rateLimitExceeded: "OpenAI API rate limit exceeded. Please try again later.",
  openaiApiError: "Error connecting to OpenAI API. Please check your API key and try again.",
  generalError: "An unexpected error occurred. Please try again.",
}
