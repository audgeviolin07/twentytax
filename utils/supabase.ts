import { createServerClient as createServerClientFromCookies } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Create a single supabase client for the browser
const createBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Missing Supabase environment variables for browser client")
    return createMockClient()
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Singleton pattern to avoid multiple instances
let browserClient: ReturnType<typeof createClient> | null = null

export const getBrowserClient = () => {
  if (!browserClient) {
    browserClient = createBrowserClient()
  }
  return browserClient
}

// Server-side client with service role for admin operations
export const createServerClient = (requestOrCookies?: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Missing Supabase environment variables for server client")
    return createMockServerClient(requestOrCookies)
  }

  // If we have a request, we're in middleware
  if (requestOrCookies && "cookies" in requestOrCookies) {
    const cookieStore = requestOrCookies.cookies
    const response = NextResponse.next()

    const supabase = createServerClientFromCookies({
      cookieStore,
      supabaseUrl,
      supabaseKey,
      options: {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      },
    })

    return { supabase, response }
  }

  // For server components and server actions, create a separate file
  throw new Error("For server components, use createServerComponentClient from './supabase-server.ts'")
}

// Create a mock client that won't throw errors for browser
function createMockClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          limit: () => Promise.resolve({ data: [], error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
          in: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
        match: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
        in: () => Promise.resolve({ error: null }),
      }),
    }),
  }
}

// Create a mock server client that won't throw errors
function createMockServerClient(requestOrCookies?: NextRequest) {
  const mockClient = createMockClient()

  if (requestOrCookies && "cookies" in requestOrCookies) {
    return {
      supabase: mockClient,
      response: NextResponse.next(),
    }
  }

  return mockClient
}
