// api/webhook.js
// iOSショートカット → Tria通知 → このエンドポイントに送信 → KV保存
import { saveTx } from './_kv.js'

const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // トークン認証（iOSショートカットのヘッダーに設定）
  const token = req.headers['x-webhook-token']
  if (WEBHOOK_TOKEN && token !== WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { text, source } = req.body

    // Tria通知のパース
    if (source === 'tria' || !source) {
      const parsed = parseTriaNotification(text)
      if (!parsed) {
        return res.status(400).json({ error: 'Parse failed', raw: text })
      }

      const tx = await saveTx({
        ...parsed,
        source: 'tria_notification',
        raw: text
      })

      return res.status(200).json({ success: true, tx })
    }

    // 汎用フォールバック（手動でJSONを送る場合）
    const tx = await saveTx({ ...req.body, source: source || 'webhook' })
    return res.status(200).json({ success: true, tx })

  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: err.message })
  }
}

/**
 * Tria通知テキストをパース
 * フォーマット:
 *   "39.56 USD Triaカードで支払い\nUBER * EATS PENDING\n🎉 0.39 USDのキャッシュバック..."
 */
function parseTriaNotification(text) {
  if (!text) return null

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // キャッシュバック通知は除外
  if (lines[0]?.includes('キャッシュバック') || lines[0]?.includes('cashback')) {
    return null
  }

  // 1行目: "39.56 USD Triaカードで支払い"
  const amountMatch = lines[0]?.match(/^([\d.]+)\s+(USD|JPY)/i)
  if (!amountMatch) return null

  const amount = parseFloat(amountMatch[1])
  const currency = amountMatch[2].toUpperCase()

  // 2行目: 店舗名
  const merchantLine = lines[1] || 'Unknown'
  const isPending = merchantLine.toUpperCase().includes('PENDING')
  const merchant = merchantLine.replace(/\s*PENDING\s*/i, '').trim()

  // カテゴリ推定
  const category = guessCategoryFromMerchant(merchant)

  return {
    amount,
    currency,
    merchant,
    category,
    isPending,
    date: new Date().toISOString().split('T')[0]
  }
}

/**
 * 店舗名からカテゴリを推定
 */
function guessCategoryFromMerchant(merchant) {
  const m = merchant.toUpperCase()

  if (/UBER|LYFT|METRO|BUS|TRAIN|PARKING/.test(m)) return 'transport'
  if (/EATS|DOORDASH|GRUBHUB|IN-N-OUT|TACO|MCDONALD|STARBUCKS|COFFEE|RAMEN|SUSHI|RESTAURANT|DINER|GRILL|FOOD/.test(m)) return 'food'
  if (/AMAZON|WALMART|TARGET|COSTCO|DOLLAR|CVS|WALGREEN/.test(m)) return 'shopping'
  if (/NETFLIX|SPOTIFY|HULU|DISNEY|APPLE|GOOGLE|STEAM|GAME/.test(m)) return 'entertainment'
  if (/HOSPITAL|PHARMACY|CLINIC|DENTAL|CVS RX/.test(m)) return 'health'
  if (/SCHOOL|COLLEGE|TEXTBOOK|TUITION/.test(m)) return 'education'
  if (/RENT|LEASE|ELECTRIC|GAS|WATER|INTERNET|WIFI/.test(m)) return 'housing'

  return 'other'
}
