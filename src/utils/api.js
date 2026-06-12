import { getToken } from './auth.js'

const BASE = import.meta.env.VITE_API_BASE || ''

async function authFetch(path, options = {}) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:expired'))
  }
  return res.json()
}

export function fetchTransactions(month) {
  return authFetch(`/api/transactions?month=${month}`)
}

export function addTransaction(data) {
  return authFetch('/api/transactions', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteTransaction(month, id) {
  return authFetch(`/api/transactions?month=${month}&id=${id}`, { method: 'DELETE' })
}

export function fetchSummary(month) {
  return authFetch(`/api/summary?month=${month}`)
}

export function uploadReceipt(imageBase64, mediaType = 'image/jpeg') {
  return authFetch('/api/receipt', { method: 'POST', body: JSON.stringify({ imageBase64, mediaType }) })
}

export function importCSV(csvText, cardType = 'generic') {
  return authFetch('/api/csv-import', { method: 'POST', body: JSON.stringify({ csvText, cardType }) })
}

export function updateTransaction(id, data) {
  return authFetch(`/api/transactions?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function fetchRecurring() {
  return authFetch('/api/recurring')
}

export function addRecurring(data) {
  return authFetch('/api/recurring', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteRecurring(id) {
  return authFetch(`/api/recurring?id=${id}`, { method: 'DELETE' })
}
