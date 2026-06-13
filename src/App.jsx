import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import Add from './pages/Add.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Nav from './components/Nav.jsx'
import { supabase, logout } from './utils/auth.js'
import { fetchRecurring, addTransaction, fetchTransactions } from './utils/api.js'
import { currentMonth } from './utils/format.js'

async function applyRecurringForMonth() {
  const key = `recurring_applied_${currentMonth()}`
  if (localStorage.getItem(key)) return
  const month = currentMonth()
  const today = new Date()
  const [txRes, recRes] = await Promise.all([fetchTransactions(month), fetchRecurring()])
  const existing = (txRes.txList || []).filter(t => t.source === 'recurring').map(t => t.merchant)
  const toAdd = (recRes.list || []).filter(r =>
    today.getDate() >= r.day_of_month && !existing.includes(r.merchant)
  )
  await Promise.all(toAdd.map(r => addTransaction({
    merchant: r.merchant, amount: r.amount, currency: r.currency,
    category: r.category, date: `${month}-${String(r.day_of_month).padStart(2, '0')}`,
    source: 'recurring'
  })))
  localStorage.setItem(key, '1')
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) applyRecurringForMonth().catch(() => {})
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(s)
        setIsRecovery(true)
        return
      }
      setSession(s)
      setIsRecovery(false)
      if (s) applyRecurringForMonth().catch(() => {})
    })

    const onExpired = () => setSession(null)
    window.addEventListener('auth:expired', onExpired)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('auth:expired', onExpired)
    }
  }, [])

  if (session === undefined) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>読み込み中...</div>
    </div>
  )

  if (!session) return <Login onLogin={() => {}} />
  if (isRecovery) return <Login onLogin={() => setIsRecovery(false)} isRecovery />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detail" element={<Detail />} />
        <Route path="/add" element={<Add />} />
        <Route path="/settings" element={<Settings onLogout={async () => { await logout(); setSession(null) }} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Nav />
    </BrowserRouter>
  )
}
