import { supabase, requireAuth } from './_supabase.js'

export default requireAuth(async function handler(req, res) {
  const month = req.query.month || new Date().toISOString().slice(0, 7)
  const [y, m] = month.split('-')
  const from = `${y}-${m}-01`
  const to = `${y}-${String(parseInt(m) % 12 + 1).padStart(2, '0')}-01`
  const userId = req.user.id

  const { data: txList, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', from)
    .lt('date', to)

  if (error) return res.status(500).json({ error: error.message })

  const active = txList.filter(t => !t.is_pending)
  const byCategory = {}
  for (const tx of active) {
    byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.amount
  }

  return res.status(200).json({
    month,
    totalUSD: active.filter(t => t.currency === 'USD').reduce((s, t) => s + t.amount, 0),
    totalJPY: active.filter(t => t.currency === 'JPY').reduce((s, t) => s + t.amount, 0),
    byCategory,
    count: txList.length,
    pendingCount: txList.filter(t => t.is_pending).length
  })
})
