import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    env_test: {
      gmail_client_id_exists: !!process.env.GMAIL_CLIENT_ID,
      gmail_client_secret_exists: !!process.env.GMAIL_CLIENT_SECRET,
      next_public_app_url_exists: !!process.env.NEXT_PUBLIC_APP_URL,
      // Add this to see what environment variables are actually loaded
      env_keys: Object.keys(process.env).filter(key => 
        key.includes('GMAIL') || key.includes('NEXT_PUBLIC')
      )
    }
  })
}