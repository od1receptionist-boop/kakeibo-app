// api/_kv.js - Vercel KV ヘルパー（KV未設定時はtmpファイルで代替）
import { v4 as uuidv4 } from 'uuid'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

// tmpファイルストア（vercel devローカル用、プロセス再起動でリセット）
const STORE_PATH = join(tmpdir(), 'kakeibo-dev-store.json')

function loadStore() {
  try { return JSON.parse(readFileSync(STORE_PATH, 'utf8')) } catch { return {} }
}
function saveStore(store) {
  writeFileSync(STORE_PATH, JSON.stringify(store), 'utf8')
}
function memSet(key, value) { const s = loadStore(); s[key] = value; saveStore(s) }
function memGet(key) { return loadStore()[key] ?? null }
function memDel(key) { const s = loadStore(); delete s[key]; saveStore(s) }
function memKeys(prefix) { return Object.keys(loadStore()).filter(k => k.startsWith(prefix)) }

let _kv = null
async function getKV() {
  if (_kv) return _kv
  const mod = await import('@vercel/kv')
  _kv = mod.kv
  return _kv
}

export async function saveTx(data) {
  const id = uuidv4()
  const date = data.date || new Date().toISOString().split('T')[0]
  const month = date.slice(0, 7)
  const key = `tx:${month}:${id}`

  const tx = {
    id,
    date,
    amount: parseFloat(data.amount),
    currency: data.currency || 'USD',
    merchant: data.merchant || 'Unknown',
    category: data.category || 'other',
    source: data.source || 'manual',
    isPending: data.isPending || false,
    raw: data.raw || null,
    createdAt: new Date().toISOString()
  }

  if (useKV) await (await getKV()).set(key, tx)
  else memSet(key, tx)
  return tx
}

export async function getTxByMonth(month) {
  if (useKV) {
    const kv = await getKV()
    const keys = await kv.keys(`tx:${month}:*`)
    if (!keys.length) return []
    const txList = await Promise.all(keys.map(k => kv.get(k)))
    return txList.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
  }
  const keys = memKeys(`tx:${month}:`)
  return keys.map(k => memGet(k)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
}

export async function deleteTx(month, id) {
  const key = `tx:${month}:${id}`
  if (useKV) await (await getKV()).del(key)
  else memDel(key)
}

/**
 * 月次サマリー計算
 */
export function calcSummary(txList) {
  const usd = txList.filter(t => t.currency === 'USD' && !t.isPending)
  const jpy = txList.filter(t => t.currency === 'JPY' && !t.isPending)

  const byCategory = {}
  for (const tx of txList.filter(t => !t.isPending)) {
    byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.amount
  }

  return {
    totalUSD: usd.reduce((s, t) => s + t.amount, 0),
    totalJPY: jpy.reduce((s, t) => s + t.amount, 0),
    byCategory,
    count: txList.length,
    pendingCount: txList.filter(t => t.isPending).length
  }
}
