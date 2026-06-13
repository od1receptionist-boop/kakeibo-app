import { supabase, requireAuth } from '../_supabase.js'

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  await supabase.from('user_profiles').update({
    gmail_access_token: null,
    gmail_refresh_token: null,
    gmail_token_expiry: null,
    gmail_connected: false,
  }).eq('user_id', req.user.id)

  return res.status(200).json({ success: true })
})
