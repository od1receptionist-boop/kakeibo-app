import { supabase } from '../_supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (error) return res.status(400).json({ error: error.message })

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
  if (loginError) return res.status(400).json({ error: loginError.message })
  return res.status(201).json({ session: loginData.session, user: loginData.user })
}
