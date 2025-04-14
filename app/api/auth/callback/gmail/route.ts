import { NextRequest } from 'next/server'
import { createServerComponentClient } from '@/utils/supabase-server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 })
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gmail`
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    // Verify state and get user information
    const supabase = await createServerComponentClient()
    const { data: stateData } = await supabase
      .from('email_auth_states')
      .select('*')
      .eq('state', state)
      .single()

    if (!stateData) {
      return new Response('Invalid state', { status: 400 })
    }

    // Store tokens in database
    await supabase
      .from('email_tokens')
      .insert({
        user_id: stateData.user_id,
        provider: stateData.provider,
        email: stateData.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
      })

    // Clean up state
    await supabase
      .from('email_auth_states')
      .delete()
      .eq('state', state)

    // Return success page that closes the popup
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'EMAIL_AUTH_SUCCESS' }, '${process.env.NEXT_PUBLIC_APP_URL}');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}