import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import Add from './pages/Add.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Nav from './components/Nav.jsx'
import { supabase, logout } from './utils/auth.js'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))

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
