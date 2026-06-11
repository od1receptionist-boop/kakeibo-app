// api/receipt.js - レシート画像 → Claude OCR → トランザクションデータ返却
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_auth.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, mediaType = 'image/jpeg' } = req.body

  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 }
            },
            {
              type: 'text',
              text: `このレシート画像から以下の情報をJSONで抽出してください。
日本語・英語レシート両対応。JSONのみ返す。マークダウン不要。

{
  "date": "YYYY-MM-DD",
  "amount": 数値（合計金額のみ。税込みがあれば税込みを使う）,
  "currency": "USD" または "JPY",
  "merchant": "店舗名",
  "items": ["品目1", "品目2"]
}

不明な場合はnullを入れる。`
            }
          ]
        }
      ]
    })

    const raw = response.content[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      return res.status(422).json({ error: 'OCR parse failed', raw })
    }

    return res.status(200).json({ parsed })
  } catch (err) {
    console.error('Receipt OCR error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }
