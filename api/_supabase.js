import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
)

export async function getUserFromRequest(req) {
  const auth = req.headers['authorization'] || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export function requireAuth(handler) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') return res.status(200).end()
    const user = await getUserFromRequest(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    return handler(req, res)
  }
}
