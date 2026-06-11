import { supabase } from './_supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers['x-webhook-token']
  if (!token) return res.status(401).json({ error: 'token required' })

  // webhook_tokenでユーザーを特定
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('webhook_token', token)
    .single()

  if (profileError || !profile) return res.status(401).json({ error: 'invalid token' })

  try {
    const { text, source } = req.body
    let txData

    if (source === 'tria' || !source) {
      txData = parseTriaNotification(text)
      if (!txData) return res.status(400).json({ error: 'parse failed', raw: text })
      txData.source = 'tria_notification'
    } else {
      txData = { ...req.body, source: source || 'webhook' }
    }

    const { data: tx, error } = await supabase.from('transactions').insert({
      user_id: profile.user_id,
      date: txData.date || new Date().toISOString().split('T')[0],
      amount: parseFloat(txData.amount),
      currency: txData.currency || 'USD',
      merchant: txData.merchant || 'Unknown',
      category: txData.category || guessCategoryFromMerchant(txData.merchant || ''),
      source: txData.source,
      is_pending: txData.isPending || false,
      raw: text || null,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, tx })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function parseTriaNotification(text) {
  if (!text) return null
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines[0]?.includes('キャッシュバック') || lines[0]?.includes('cashback')) return null

  const triaMatch = lines[0]?.match(/^([\d.]+)\s+(USD|JPY)/i)
  if (triaMatch) {
    const amount = parseFloat(triaMatch[1])
    const currency = triaMatch[2].toUpperCase()
    const merchantLine = lines[1] || 'Unknown'
    const isPending = merchantLine.toUpperCase().includes('PENDING')
    const merchant = merchantLine.replace(/\s*PENDING\s*/i, '').trim()
    return { amount, currency, merchant, isPending, date: today() }
  }

  const fullText = lines.join(' ')
  const jpyMatch = fullText.match(/[-−]?[\d,]+円/) || fullText.match(/¥[\d,]+/)
  if (jpyMatch) {
    const amount = parseInt(jpyMatch[0].replace(/[^0-9]/g, ''), 10)
    if (!amount) return null
    const storeMatch = fullText.match(/(?:加盟店|店舗|利用先|支払先)[：:]\s*([^\s/／]+)/)
    let merchant
    if (storeMatch) {
      merchant = storeMatch[1]
    } else {
      merchant = fullText
        .replace(/[-−]?[\d,]+円/g, '').replace(/¥[\d,]+/g, '')
        .replace(/PayPay支払い|PayPay決済|ご利用金額|利用金額/g, '')
        .replace(/\s+/g, ' ').trim() || 'Unknown'
    }
    return { amount, currency: 'JPY', merchant, isPending: false, date: today() }
  }
  return null
}

function today() { return new Date().toISOString().split('T')[0] }

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
