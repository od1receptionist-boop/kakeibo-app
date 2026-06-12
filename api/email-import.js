import { supabase } from './_supabase.js'
import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-token')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers['x-webhook-token']
  if (!token) return res.status(401).json({ error: 'token required' })

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('webhook_token', token)
    .single()

  if (profileError || !profile) return res.status(401).json({ error: 'invalid token' })

  const { subject = '', body = '', from = '' } = req.body
  if (!body) return res.status(400).json({ error: 'body required' })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `クレジットカードまたは決済サービスの利用通知メールです。
以下のメール情報から取引情報をJSONで抽出してください。

送信元: ${from}
件名: ${subject}
本文:
${body.slice(0, 2000)}

以下のJSON形式で返してください。取引通知でない場合は {"skip": true} を返してください。
{
  "date": "YYYY-MM-DD",
  "amount": 数値,
  "currency": "USD or JPY",
  "merchant": "店舗名",
  "category": "food|transport|shopping|entertainment|health|education|housing|other"
}

JSONのみ返してください。`

  let parsed
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    })
    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] || text)
  } catch (e) {
    return res.status(500).json({ error: 'parse failed', detail: e.message })
  }

  if (parsed.skip) return res.status(200).json({ skipped: true })
  if (!parsed.amount || !parsed.merchant) return res.status(400).json({ error: 'insufficient data', parsed })

  const { data: tx, error } = await supabase.from('transactions').insert({
    user_id: profile.user_id,
    date: parsed.date || new Date().toISOString().split('T')[0],
    amount: parseFloat(parsed.amount),
    currency: parsed.currency || 'JPY',
    merchant: parsed.merchant,
    category: parsed.category || 'other',
    source: 'email',
    raw: `${subject}\n${body}`.slice(0, 500),
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true, tx })
}
