import { supabase } from '../_supabase.js'

export default async function handler(req, res) {
  const { code, state, error } = req.query
  const appUrl = process.env.APP_URL || 'https://kakeibo-app-vert-six.vercel.app'

  if (error || !code || !state) {
    return res.redirect(`${appUrl}/settings?gmail=error`)
  }

  let userId
  try {
    userId = Buffer.from(state, 'base64url').toString('utf-8')
  } catch {
    return res.redirect(`${appUrl}/settings?gmail=error`)
  }

  const redirectUri = `${appUrl}/api/auth/google-callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.access_token) {
    return res.redirect(`${appUrl}/settings?gmail=error`)
  }

  await supabase.from('user_profiles').update({
    gmail_access_token: tokens.access_token,
    gmail_refresh_token: tokens.refresh_token || null,
    gmail_token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    gmail_connected: true,
  }).eq('user_id', userId)

  return res.redirect(`${appUrl}/settings?gmail=connected`)
}
