import { useState, useEffect, useCallback } from 'react'
import { fetchTransactions, fetchSummary, deleteTransaction, updateTransaction } from '../utils/api.js'
import { currentMonth } from '../utils/format.js'

export default function useTransactions(month = currentMonth()) {
  const [txList, setTxList] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [txData, sumData] = await Promise.all([
        fetchTransactions(month),
        fetchSummary(month)
      ])
      setTxList(txData.txList || [])
      setSummary(sumData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const remove = async (id) => {
    await deleteTransaction(month, id)
    setTxList(prev => prev.filter(t => t.id !== id))
  }

  const update = async (id, data) => {
    const res = await updateTransaction(id, data)
    if (res.tx) setTxList(prev => prev.map(t => t.id === id ? res.tx : t))
    return res
  }

  return { txList, summary, loading, error, reload: load, remove, update }
}
