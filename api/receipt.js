import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_supabase.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default requireAuth(async function handler(req, res) {
  const { imageBase64, mediaType = 'image/jpeg' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
  if (!supportedTypes.includes(mediaType)) {
    return res.status(400).json({ error: `unsupported media type: ${mediaType}` })
  }

  try {
    const contentItem = mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          contentItem,
          {
            type: 'text',
            text: `この画像を分析してください。

【パターンA】アプリの取引履歴リスト（複数の取引が並んでいる場合）:
TriaカードやUber、銀行アプリなどのトランザクション一覧スクリーンショットであれば、
全件を配列で返してください。JSONのみ返す。マークダウン不要。

{"type": "list", "transactions": [
  {"date": "YYYY-MM-DD", "amount": 数値, "currency": "USD or JPY", "merchant": "店舗名", "category": "food|transport|shopping|entertainment|health|education|housing|other"},
  ...
]}

【パターンB】単票レシート・領収書の場合:
{"type": "receipt", "date": "YYYY-MM-DD", "amount": 数値, "currency": "USD or JPY", "merchant": "店舗名", "items": ["品目1"]}

判断基準:
- 複数の取引が縦に並んでいる → パターンA
- 1枚のレシート・領収書 → パターンB
- 不明な値はnull
- 金額が緑色(プラス)はキャッシュバック・入金なので除外
- 0 USDの取引は除外

JSONのみ返す。`
          }
        ]
      }]
    })

    const raw = response.content[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    let result
    try { result = JSON.parse(clean) } catch {
      return res.status(422).json({ error: 'OCR parse failed', raw })
    }

    if (result.type === 'list') {
      return res.status(200).json({ parsedList: result.transactions || [] })
    }
    return res.status(200).json({ parsed: result })
  } catch (err) {
    console.error('Receipt OCR error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
