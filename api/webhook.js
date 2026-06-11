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
 * 通知テキストをパース（Tria / 日本カード 両対応）
 */
function parseTriaNotification(text) {
  if (!text) return null

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // キャッシュバック通知は除外
  if (lines[0]?.includes('キャッシュバック') || lines[0]?.includes('cashback')) return null

  // ── Tria フォーマット: "39.56 USD Triaカードで支払い" ──
  const triaMatch = lines[0]?.match(/^([\d.]+)\s+(USD|JPY)/i)
  if (triaMatch) {
    const amount = parseFloat(triaMatch[1])
    const currency = triaMatch[2].toUpperCase()
    const merchantLine = lines[1] || 'Unknown'
    const isPending = merchantLine.toUpperCase().includes('PENDING')
    const merchant = merchantLine.replace(/\s*PENDING\s*/i, '').trim()
    return { amount, currency, merchant, category: guessCategoryFromMerchant(merchant), isPending, date: today() }
  }

  // ── 日本カード汎用フォーマット ──
  // 対応パターン:
  //   楽天: "ご利用金額：1,234円 / 加盟店：スターバックス"
  //   三井住友: "利用金額1,234円 スターバックスコーヒー"
  //   PayPay通知: "PayPay支払い -890円 ローソン"
  //   汎用: 金額（円）+ 店舗名が1テキスト内にある

  const fullText = lines.join(' ')

  // 円建て金額を探す: 1,234円 / ¥1,234 / -1,234円
  const jpyMatch = fullText.match(/[-−]?[\d,]+円/) || fullText.match(/¥[\d,]+/)
  if (jpyMatch) {
    const amountStr = jpyMatch[0].replace(/[^0-9]/g, '')
    const amount = parseInt(amountStr, 10)
    if (!amount) return null

    // 店舗名抽出: 「加盟店：XXX」パターン優先 → 金額・記号を除いた末尾テキスト
    const storeMatch = fullText.match(/(?:加盟店|店舗|利用先|支払先)[：:]\s*([^\s/／]+)/)
    let merchant
    if (storeMatch) {
      merchant = storeMatch[1]
    } else {
      // 金額表記・PayPayプレフィックスを除去して残りを店舗名とする
      merchant = fullText
        .replace(/[-−]?[\d,]+円/g, '')
        .replace(/¥[\d,]+/g, '')
        .replace(/PayPay支払い|PayPay決済|ご利用金額|利用金額/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Unknown'
    }

    return { amount, currency: 'JPY', merchant, category: guessCategoryFromMerchant(merchant), isPending: false, date: today() }
  }

  return null
}

function today() {
  return new Date().toISOString().split('T')[0]
}

/**
 * 店舗名からカテゴリを推定（英語・日本語対応）
 */
function guessCategoryFromMerchant(merchant) {
  const m = merchant.toUpperCase()

  const t = (re) => re.test(m)

  if (t(/UBER|LYFT|METRO|BUS|TRAIN|PARKING|SUICA|PASMO|ICOCA|JAL|ANA|AIRLINE/) || t(/電車|バス|タクシー|駐車|高速/)) return 'transport'
  if (t(/EATS|DOORDASH|GRUBHUB|IN-N-OUT|TACO|MCDONALD|STARBUCKS|COFFEE|RAMEN|SUSHI|RESTAURANT|DINER|GRILL|FOOD/) || t(/マクドナルド|スタバ|すき家|吉野家|松屋|ラーメン|寿司|定食|居酒屋|カフェ|コーヒー|ファミレス|焼肉|うどん|そば|弁当|デリバリー/)) return 'food'
  if (t(/AMAZON|WALMART|TARGET|COSTCO|DOLLAR|CVS|WALGREEN/) || t(/イオン|西友|マルエツ|ライフ|ドンキ|ユニクロ|しまむら|無印|ニトリ|セブン|ファミマ|ローソン|ミニストップ/)) return 'shopping'
  if (t(/NETFLIX|SPOTIFY|HULU|DISNEY|APPLE|GOOGLE|STEAM|GAME/) || t(/映画|カラオケ|ゲーム|ネットフリックス|ディズニー/)) return 'entertainment'
  if (t(/HOSPITAL|PHARMACY|CLINIC|DENTAL/) || t(/病院|クリニック|薬局|ドラッグストア|マツキヨ|ツルハ|スギ薬局|調剤/)) return 'health'
  if (t(/SCHOOL|COLLEGE|TEXTBOOK|TUITION/) || t(/塾|予備校|学校|大学|教材/)) return 'education'
  if (t(/RENT|LEASE|ELECTRIC|GAS|WATER|INTERNET|WIFI/) || t(/家賃|電気|水道|ネット|通信|NTT|ソフトバンク|ドコモ/)) return 'housing'

  return 'other'
}
