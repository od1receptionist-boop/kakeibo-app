import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_supabase.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default requireAuth(async function handler(req, res) {
  const { imageBase64, mediaType = 'image/jpeg' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  // PDF と画像両対応
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
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          contentItem,
          {
            type: 'text',
            text: `このレシート・領収書から以下をJSONで抽出してください。日本語・英語・PDF対応。JSONのみ返す。マークダウン不要。

{
  "date": "YYYY-MM-DD",
  "amount": 数値（合計金額。税込みがあれば税込み）,
  "currency": "USD" または "JPY",
  "merchant": "店舗名",
  "items": ["品目1", "品目2"]
}

不明な場合はnullを入れる。`
          }
        ]
      }]
    })

    const raw = response.content[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    let parsed
    try { parsed = JSON.parse(clean) } catch {
      return res.status(422).json({ error: 'OCR parse failed', raw })
    }
    return res.status(200).json({ parsed })
  } catch (err) {
    console.error('Receipt OCR error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
