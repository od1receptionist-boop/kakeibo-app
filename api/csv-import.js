import { supabase, requireAuth } from './_supabase.js'

export default requireAuth(async function handler(req, res) {
  const { csvText, cardType = 'generic' } = req.body
  if (!csvText) return res.status(400).json({ error: 'csvText required' })

  try {
    const rows = parseCSV(csvText, cardType)
    const inserts = rows.map(r => ({
      user_id: req.user.id,
      date: r.date,
      amount: r.amount,
      currency: r.currency,
      merchant: r.merchant,
      category: 'other',
      source: `csv_${cardType}`,
      is_pending: false,
    }))

    const { data, error } = await supabase.from('transactions').insert(inserts).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, count: data.length, txList: data })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

function parseCSV(csvText, cardType) {
  const lines = csvText.trim().split('\n').slice(1)
  return lines.map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    if (cardType === 'paypay') {
      const [date, merchant, amountStr] = cols
      const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''))
      if (isNaN(amount)) return null
      return { date: normalizeDate(date), merchant, amount, currency: 'JPY' }
    }
    const [date, merchant, amountStr, currency] = cols
    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''))
    if (isNaN(amount)) return null
    return { date: normalizeDate(date), merchant, amount, currency: currency?.toUpperCase() || 'USD' }
  }).filter(Boolean)
}

function normalizeDate(str) {
  if (!str) return new Date().toISOString().split('T')[0]
  return str.replace(/\//g, '-')
}
