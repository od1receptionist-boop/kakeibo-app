// api/_auth.js - 認証ヘルパー（将来Supabase Authに差し替え可）
import crypto from 'crypto'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verify(token) {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const data = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (payload.exp && payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

function getToken(req) {
  const cookies = req.headers.cookie || ''
  const match = cookies.match(/kakeibo_session=([^;]+)/)
  return match ? match[1] : null
}

export function setCookieHeader(token) {
  const isProduction = process.env.VERCEL_ENV === 'production'
  const secure = isProduction ? 'Secure; ' : ''
  const maxAge = 30 * 24 * 60 * 60
  return `kakeibo_session=${token}; HttpOnly; ${secure}SameSite=Strict; Max-Age=${maxAge}; Path=/`
}

export function clearCookieHeader() {
  return 'kakeibo_session=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/'
}

export function requireAuth(handler) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') return handler(req, res)
    const token = getToken(req)
    const payload = verify(token)
    if (!payload) return res.status(401).json({ error: 'Unauthorized' })
    req.user = payload
    return handler(req, res)
  }
}

export { sign, verify }
