import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  // Handle the OAuth callback
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 })
  }

  try {
    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify state and get user information
    const { data: stateData } = await supabase
      .from('email_auth_states')
      .select('*')
      .eq('state', state)
      .single()

    if (!stateData) {
      return new Response('Invalid state', { status: 400 })
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Store tokens in database
    await supabase
      .from('email_tokens')
      .insert({
        user_id: stateData.user_id,
        provider: stateData.provider,
        email: stateData.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
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
            window.opener.postMessage({ type: 'EMAIL_AUTH_SUCCESS' }, '${Deno.env.get('NEXT_PUBLIC_APP_URL')}');
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
})

async function exchangeCodeForTokens(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GMAIL_CLIENT_ID'),
      client_secret: Deno.env.get('GMAIL_CLIENT_SECRET'),
      redirect_uri: `${Deno.env.get('NEXT_PUBLIC_APP_URL')}/api/auth/callback/gmail`,
      grant_type: 'authorization_code',
    }),
  })

  return response.json()
}