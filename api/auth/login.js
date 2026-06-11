import { sign, setCookieHeader } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body
  if (!password || password !== (process.env.APP_PASSWORD || '').trim()) {
    return res.status(401).json({ error: 'パスワードが違います' })
  }

  const token = sign({ sub: 'owner', exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  res.setHeader('Set-Cookie', setCookieHeader(token))
  return res.status(200).json({ ok: true })
}
