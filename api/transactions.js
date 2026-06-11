import { supabase, requireAuth } from './_supabase.js'
import { v4 as uuidv4 } from 'uuid'

export default requireAuth(async function handler(req, res) {
  const userId = req.user.id

  if (req.method === 'GET') {
    const month = req.query.month || new Date().toISOString().slice(0, 7)
    const [y, m] = month.split('-')
    const from = `${y}-${m}-01`
    const to = `${y}-${String(parseInt(m) % 12 + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lt('date', to)
      .order('date', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ txList: data, month })
  }

  if (req.method === 'POST') {
    const tx = buildTx(req.body, userId)
    const { data, error } = await supabase.from('transactions').insert(tx).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ tx: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})

export function buildTx(data, userId) {
  return {
    user_id: userId,
    date: data.date || new Date().toISOString().split('T')[0],
    amount: parseFloat(data.amount),
    currency: data.currency || 'USD',
    merchant: data.merchant || 'Unknown',
    category: data.category || 'other',
    source: data.source || 'manual',
    is_pending: data.isPending || false,
    raw: data.raw || null,
  }
}
