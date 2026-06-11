// api/summary.js
import { getTxByMonth, calcSummary } from './_kv.js'
import { requireAuth } from './_auth.js'

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const month = req.query.month || new Date().toISOString().slice(0, 7)

  try {
    const txList = await getTxByMonth(month)
    const summary = calcSummary(txList)
    return res.status(200).json({ month, ...summary })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})
