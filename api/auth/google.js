import { requireAuth } from '../_supabase.js'

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const userId = req.user.id
  const state = Buffer.from(userId).toString('base64url')
  const redirectUri = `${process.env.APP_URL || 'https://kakeibo-app-vert-six.vercel.app'}/api/auth/google-callback`

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
})
