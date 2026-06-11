import { requireAuth } from '../_auth.js'

export default requireAuth(async (req, res) => {
  return res.status(200).json({ ok: true })
})
