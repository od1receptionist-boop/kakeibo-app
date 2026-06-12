import { supabase, requireAuth } from './_supabase.js'

export default requireAuth(async function handler(req, res) {
  const userId = req.user.id

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_month', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ list: data })
  }

  if (req.method === 'POST') {
    const { merchant, amount, currency, category, day_of_month } = req.body
    if (!merchant || !amount) return res.status(400).json({ error: 'merchant and amount required' })
    const { data, error } = await supabase.from('recurring_transactions').insert({
      user_id: userId,
      merchant,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      category: category || 'other',
      day_of_month: parseInt(day_of_month) || 1,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ item: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabase
      .from('recurring_transactions').delete().eq('id', id).eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
