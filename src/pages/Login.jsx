import { useState } from 'react'
import { login, signup } from '../utils/auth.js'

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await signup(email, password)
      }
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Kakeibo</p>

      {/* タブ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, width: '100%', maxWidth: 320 }}>
        {[['login', 'ログイン'], ['signup', '新規登録']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError('') }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: tab === key ? 'var(--accent)' : 'var(--surface)',
              color: tab === key ? '#0F0F0F' : 'var(--text)',
              fontWeight: tab === key ? 700 : 400, fontSize: 14
            }}
          >{label}</button>
        ))}
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
          style={{ fontSize: 16 }}
        />
        <input
          type="password"
          placeholder="パスワード（6文字以上）"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ fontSize: 16 }}
        />
        {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{
            padding: '14px',
            background: 'var(--accent)', color: '#0F0F0F',
            borderRadius: 12, fontWeight: 700, fontSize: 16,
            opacity: loading || !email || !password ? 0.6 : 1
          }}
        >
          {loading ? '処理中...' : tab === 'login' ? 'ログイン' : 'アカウント作成'}
        </button>
      </form>
    </div>
  )
}
