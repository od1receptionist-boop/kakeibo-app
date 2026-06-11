import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import Add from './pages/Add.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Nav from './components/Nav.jsx'
import { checkAuth } from './utils/auth.js'

export default function App() {
  const [authed, setAuthed] = useState(null) // null = loading

  useEffect(() => {
    checkAuth()
      .then(ok => setAuthed(ok))
      .catch(() => setAuthed(false))
  }, [])

  if (authed === null) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>読み込み中...</div>
    </div>
  )

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detail" element={<Detail />} />
        <Route path="/add" element={<Add />} />
        <Route path="/settings" element={<Settings onLogout={() => setAuthed(false)} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Nav />
    </BrowserRouter>
  )
}
