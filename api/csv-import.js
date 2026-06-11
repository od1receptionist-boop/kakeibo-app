// api/csv-import.js - PayPay / クレカ CSV取り込み
import { saveTx } from './_kv.js'
import { requireAuth } from './_auth.js'

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { csvText, cardType = 'generic' } = req.body
  if (!csvText) return res.status(400).json({ error: 'csvText required' })

  try {
    const rows = parseCSV(csvText, cardType)
    const saved = []

    for (const row of rows) {
      const tx = await saveTx({ ...row, source: `csv_${cardType}` })
      saved.push(tx)
    }

    return res.status(200).json({ success: true, count: saved.length, txList: saved })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

function parseCSV(csvText, cardType) {
  const lines = csvText.trim().split('\n').slice(1) // ヘッダー除外

  return lines
    .map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))

      if (cardType === 'paypay') {
        // PayPay: 日付, 支払先, 金額, 種別
        const [date, merchant, amountStr] = cols
        const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''))
        if (isNaN(amount)) return null
        return { date: normalizeDate(date), merchant, amount, currency: 'JPY' }
      }

      // 汎用クレカ: 日付, 内容, 金額, 通貨
      const [date, merchant, amountStr, currency] = cols
      const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''))
      if (isNaN(amount)) return null
      return {
        date: normalizeDate(date),
        merchant,
        amount,
        currency: currency?.toUpperCase() || 'USD'
      }
    })
    .filter(Boolean)
}

function normalizeDate(str) {
  if (!str) return new Date().toISOString().split('T')[0]
  // YYYY/MM/DD → YYYY-MM-DD
  return str.replace(/\//g, '-')
}
