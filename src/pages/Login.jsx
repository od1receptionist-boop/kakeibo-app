import { useState } from 'react'
import { login } from '../utils/auth.js'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const ok = await login(password)
    setLoading(false)
    if (ok) onLogin()
    else setError('パスワードが違います')
  }

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 32px',
      background: 'var(--bg)'
    }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>💴</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>家計簿</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 40 }}>Kakeibo</p>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          style={{ fontSize: 18, textAlign: 'center', letterSpacing: 4 }}
        />
        {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            padding: '14px',
            background: 'var(--accent)',
            color: '#0F0F0F',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            opacity: loading || !password ? 0.6 : 1
          }}
        >
          {loading ? '確認中...' : 'ログイン'}
        </button>
      </form>
    </div>
  )
}
