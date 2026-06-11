// api/_kv.js - ストレージヘルパー（Upstash Redis / tmpファイルフォールバック）
import { v4 as uuidv4 } from 'uuid'
import { readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

// tmpファイルストア（KV未設定のローカル開発用）
const STORE_PATH = join(tmpdir(), 'kakeibo-dev-store.json')
function loadStore() { try { return JSON.parse(readFileSync(STORE_PATH, 'utf8')) } catch { return {} } }
function saveStore(s) { writeFileSync(STORE_PATH, JSON.stringify(s), 'utf8') }
function memSet(key, val) { const s = loadStore(); s[key] = val; saveStore(s) }
function memGet(key) { return loadStore()[key] ?? null }
function memDel(key) { const s = loadStore(); delete s[key]; saveStore(s) }
function memKeys(prefix) { return Object.keys(loadStore()).filter(k => k.startsWith(prefix)) }

let _redis = null
async function getRedis() {
  if (_redis) return _redis
  const { Redis } = await import('@upstash/redis')
  _redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
  return _redis
}

export async function saveTx(data) {
  const id = uuidv4()
  const date = data.date || new Date().toISOString().split('T')[0]
  const month = date.slice(0, 7)
  const key = `tx:${month}:${id}`

  const tx = {
    id, date,
    amount: parseFloat(data.amount),
    currency: data.currency || 'USD',
    merchant: data.merchant || 'Unknown',
    category: data.category || 'other',
    source: data.source || 'manual',
    isPending: data.isPending || false,
    raw: data.raw || null,
    createdAt: new Date().toISOString()
  }

  if (useKV) await (await getRedis()).set(key, tx)
  else memSet(key, tx)
  return tx
}

export async function getTxByMonth(month) {
  if (useKV) {
    const redis = await getRedis()
    const keys = await redis.keys(`tx:${month}:*`)
    if (!keys.length) return []
    const txList = await redis.mget(...keys)
    return txList.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
  }
  const keys = memKeys(`tx:${month}:`)
  return keys.map(k => memGet(k)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))
}

export async function deleteTx(month, id) {
  const key = `tx:${month}:${id}`
  if (useKV) await (await getRedis()).del(key)
  else memDel(key)
}

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
