// api/transactions.js
import { saveTx, getTxByMonth, deleteTx } from './_kv.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // GET: 月別取得
    if (req.method === 'GET') {
      const month = req.query.month || new Date().toISOString().slice(0, 7)
      const txList = await getTxByMonth(month)
      return res.status(200).json({ txList, month })
    }

    // POST: 手動追加
    if (req.method === 'POST') {
      const tx = await saveTx({ ...req.body, source: 'manual' })
      return res.status(201).json({ tx })
    }

    // DELETE: 削除
    if (req.method === 'DELETE') {
      const { month, id } = req.query
      if (!month || !id) return res.status(400).json({ error: 'month and id required' })
      await deleteTx(month, id)
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Transactions error:', err)
    return res.status(500).json({ error: err.message })
  }
}
