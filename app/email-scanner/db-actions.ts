"use server"

import { createServerComponentClient } from "@/utils/supabase-server"
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { revalidatePath } from "next/cache"

// Type definitions
interface EmailData {
  from_address: string
  subject: string
  date: string
  preview: string
  read: boolean
  starred: boolean
  has_tax_document: boolean
  document_type?: string
}

interface TaxDocumentData {
  document_type: string
  issuer: string
  tax_year: string
  financial_data: Record<string, any>
  email_id?: string
}

// Function to check if Supabase is configured
function isSupabaseConfigured() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(supabaseUrl && supabaseKey)
}

// Save emails to the database
export async function saveEmails(userId: string, emails: EmailData[]) {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error("Database not configured")
    }

    const supabase = await createServerComponentClient()

    // Insert emails in batches
    const { data, error } = await supabase
      .from("emails")
      .insert(emails.map((email) => ({ ...email, user_id: userId })))
      .select()

    if (error) {
      console.error("Error saving emails:", error)
      throw new Error("Failed to save emails")
    }

    revalidatePath("/email-scanner")
    return data
  } catch (error: any) {
    console.error("Error in saveEmails:", error)
    throw error
  }
}

export async function createServerComponentClient() {
  return createServerComponentClient<Database>({
    cookies
  })
}

// Update getUserEmails
export async function getUserEmails(userId: string) {
  try {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, returning mock data")
      return []
    }

    const supabase = await createServerComponentClient()

    const { data, error } = await supabase
      .from("emails")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching user emails:", error)
      throw new Error("Failed to fetch user emails")
    }

    return data
  } catch (error: any) {
    console.error("Error in getUserEmails:", error)
    return []
  }
}

// Update updateEmail
export async function updateEmail(emailId: string, updates: Partial<EmailData>) {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error("Database not configured")
    }

    const supabase = await createServerComponentClient()

    const { data, error } = await supabase
      .from("emails")
      .update(updates)
      .eq("id", emailId)
      .select()

    if (error) {
      console.error("Error updating email:", error)
      throw new Error("Failed to update email")
    }

    return data
  } catch (error: any) {
    console.error("Error in updateEmail:", error)
    throw error
  }
}

// Delete emails
export async function deleteEmails(emailIds: string[]) {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error("Database not configured")
    }

    const supabase = await createServerComponentClient()

    const { error } = await supabase
      .from("emails")
      .delete()
      .in("id", emailIds)

    if (error) {
      console.error("Error deleting emails:", error)
      throw new Error("Failed to delete emails")
    }

    return true
  } catch (error: any) {
    console.error("Error in deleteEmails:", error)
    throw error
  }
}

// Update saveTaxDocument
export async function saveTaxDocument(userId: string, document: TaxDocumentData) {
  try {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, mock save document")
      return { id: `mock-doc-${Date.now()}`, ...document, user_id: userId }
    }

    const supabase = await createServerComponentClient()

    const { data, error } = await supabase
      .from("tax_documents")
      .insert({
        ...document,
        user_id: userId,
      })
      .select()

    if (error) {
      console.error("Error saving tax document:", error)
      throw new Error("Failed to save tax document")
    }

    return data
  } catch (error: any) {
    console.error("Error in saveTaxDocument:", error)
    return { id: `mock-doc-${Date.now()}`, ...document, user_id: userId }
  }
}

// Update getUserTaxDocuments
export async function getUserTaxDocuments(userId: string) {
  try {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, returning mock data")
      return []
    }

    const supabase = await createServerComponentClient()

    const { data, error } = await supabase
      .from("tax_documents")
      .select("*, emails(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user tax documents:", error)
      throw new Error("Failed to fetch user tax documents")
    }

    return data
  } catch (error: any) {
    console.error("Error in getUserTaxDocuments:", error)
    return []
  }
}