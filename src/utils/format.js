export function getDefaultCurrency() {
  return localStorage.getItem('defaultCurrency') || 'USD'
}
export function setDefaultCurrency(c) {
  localStorage.setItem('defaultCurrency', c)
}

export const CATEGORIES = {
  food: { label: '食費', emoji: '🍜' },
  transport: { label: '交通', emoji: '🚗' },
  shopping: { label: '買い物', emoji: '🛒' },
  entertainment: { label: '娯楽', emoji: '🎮' },
  health: { label: '医療', emoji: '💊' },
  education: { label: '学費', emoji: '📚' },
  housing: { label: '住居', emoji: '🏠' },
  other: { label: 'その他', emoji: '📦' }
}

export function formatAmount(amount, currency = 'USD') {
  if (currency === 'JPY') {
    return `¥${Math.round(amount).toLocaleString()}`
  }
  return `$${amount.toFixed(2)}`
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function monthLabel(month) {
  const [y, m] = month.split('-')
  return `${y}年${parseInt(m)}月`
}

export function prevMonth(month) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function nextMonth(month) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getUSDtoJPY() {
  const cached = localStorage.getItem('fx_usd_jpy')
  if (cached) {
    const { rate, ts } = JSON.parse(cached)
    if (Date.now() - ts < 3600_000) return rate
  }
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=JPY')
    const json = await res.json()
    const rate = json.rates.JPY
    localStorage.setItem('fx_usd_jpy', JSON.stringify({ rate, ts: Date.now() }))
    return rate
  } catch {
    return null
  }
}
