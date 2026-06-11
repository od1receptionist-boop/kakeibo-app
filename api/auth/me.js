import { requireAuth } from '../_supabase.js'

export default requireAuth(async (req, res) => {
  return res.status(200).json({ ok: true, user: req.user })
})
