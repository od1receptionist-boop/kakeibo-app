import { supabase, requireAuth } from '../_supabase.js'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

async function gmailFetch(path, accessToken) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.json()
}

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = req.user.id

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_connected')
    .eq('user_id', userId)
    .single()

  if (!profile?.gmail_connected) {
    return res.status(400).json({ error: 'Gmail not connected' })
  }

  let accessToken = profile.gmail_access_token
  const expired = new Date(profile.gmail_token_expiry) < new Date(Date.now() + 60_000)
  if (expired && profile.gmail_refresh_token) {
    const newTokens = await refreshAccessToken(profile.gmail_refresh_token)
    if (!newTokens.access_token) return res.status(401).json({ error: 'token refresh failed' })
    accessToken = newTokens.access_token
    await supabase.from('user_profiles').update({
      gmail_access_token: accessToken,
      gmail_token_expiry: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
    }).eq('user_id', userId)
  }

  // カード通知メールを検索（よくある件名・送信元）
  const query = [
    'is:unread',
    '(',
    'subject:"ご利用のお知らせ"',
    'OR subject:"利用通知"',
    'OR subject:"カードご利用"',
    'OR subject:"card transaction"',
    'OR subject:"transaction alert"',
    'OR from:vpass@vpass.ne.jp',
    'OR from:info@card.jcb.co.jp',
    'OR from:AmericanExpress@welcome.aexp.com',
    'OR from:rakuten_card@rakuten.co.jp',
    ')',
  ].join(' ')

  const listRes = await gmailFetch(`/messages?q=${encodeURIComponent(query)}&maxResults=20`, accessToken)
  const messages = listRes.messages || []

  if (messages.length === 0) {
    return res.status(200).json({ count: 0, message: '新しいカード通知メールはありません' })
  }

  const saved = []
  for (const { id } of messages) {
    const msg = await gmailFetch(`/messages/${id}?format=full`, accessToken)
    const headers = msg.payload?.headers || []
    const subject = headers.find(h => h.name === 'Subject')?.value || ''
    const from = headers.find(h => h.name === 'From')?.value || ''
    const date = headers.find(h => h.name === 'Date')?.value || ''

    // メール本文を取得（マルチパート対応）
    let body = ''
    const extractText = (part) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
      if (part.parts) return part.parts.map(extractText).join('\n')
      return ''
    }
    body = extractText(msg.payload)

    const prompt = `クレジットカードまたは決済サービスの利用通知メールです。
送信元: ${from}
件名: ${subject}
本文:
${body.slice(0, 1500)}

取引情報をJSONで返してください。取引通知でない場合は {"skip": true}。
{"date":"YYYY-MM-DD","amount":数値,"currency":"USD or JPY","merchant":"店舗名","category":"food|transport|shopping|entertainment|health|education|housing|other"}
JSONのみ返す。`

    let parsed
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = message.content[0].text.trim()
      const match = text.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match?.[0] || text)
    } catch { continue }

    if (parsed.skip || !parsed.amount || !parsed.merchant) {
      // 取引でないメールも既読にする
      await gmailFetch(`/messages/${id}/modify`, accessToken)
      continue
    }

    const { data: tx } = await supabase.from('transactions').insert({
      user_id: userId,
      date: parsed.date || new Date().toISOString().split('T')[0],
      amount: parseFloat(parsed.amount),
      currency: parsed.currency || 'JPY',
      merchant: parsed.merchant,
      category: parsed.category || 'other',
      source: 'email',
      raw: `${subject}\n${body}`.slice(0, 500),
    }).select().single()

    if (tx) saved.push(tx)

    // 既読にする
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    })
  }

  return res.status(200).json({ count: saved.length, saved })
})
