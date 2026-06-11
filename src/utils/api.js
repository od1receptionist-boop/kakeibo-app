const BASE = import.meta.env.VITE_API_BASE || ''

export async function fetchTransactions(month) {
  const res = await fetch(`${BASE}/api/transactions?month=${month}`)
  return res.json()
}

export async function addTransaction(data) {
  const res = await fetch(`${BASE}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteTransaction(month, id) {
  const res = await fetch(`${BASE}/api/transactions?month=${month}&id=${id}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function fetchSummary(month) {
  const res = await fetch(`${BASE}/api/summary?month=${month}`)
  return res.json()
}

export async function uploadReceipt(imageBase64, mediaType = 'image/jpeg') {
  const res = await fetch(`${BASE}/api/receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType })
  })
  return res.json()
}

export async function importCSV(csvText, cardType = 'generic') {
  const res = await fetch(`${BASE}/api/csv-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvText, cardType })
  })
  return res.json()
}
