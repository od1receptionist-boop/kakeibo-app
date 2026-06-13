import { useState } from 'react'
import { login, signup, resetPassword, updatePassword } from '../utils/auth.js'

export default function Login({ onLogin, isRecovery = false }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isRecovery) {
        await updatePassword(newPassword)
        onLogin()
      } else if (tab === 'login') {
        await login(email, password)
        onLogin()
      } else if (tab === 'reset') {
        await resetPassword(email)
        setResetSent(true)
      } else {
        await signup(email, password)
        onLogin()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isRecovery) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>新しいパスワード</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>6文字以上で設定してください</p>
        <form onSubmit={submit} style={formStyle}>
          <input
            type="password"
            placeholder="新しいパスワード（6文字以上）"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoFocus
            style={{ fontSize: 16 }}
          />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading || newPassword.length < 6} style={btnStyle(loading || newPassword.length < 6)}>
            {loading ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>💴</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>家計簿</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Kakeibo</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, width: '100%', maxWidth: 320 }}>
        {[['login', 'ログイン'], ['signup', '新規登録']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(''); setResetSent(false) }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: tab === key ? 'var(--accent)' : 'var(--surface)',
              color: tab === key ? '#0F0F0F' : 'var(--text)',
              fontWeight: tab === key ? 700 : 400, fontSize: 14
            }}
          >{label}</button>
        ))}
      </div>

      {tab === 'reset' ? (
        <form onSubmit={submit} style={formStyle}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            登録したメールアドレスを入力してください。<br />リセット用リンクを送信します。
          </p>
          {resetSent ? (
            <p style={{ color: 'var(--accent)', fontSize: 14, textAlign: 'center' }}>
              ✓ メールを送信しました。受信ボックスをご確認ください。
            </p>
          ) : (
            <>
              <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} autoFocus style={{ fontSize: 16 }} />
              {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
              <button type="submit" disabled={loading || !email} style={btnStyle(loading || !email)}>
                {loading ? '送信中...' : 'リセットメールを送信'}
              </button>
            </>
          )}
          <button type="button" onClick={() => { setTab('login'); setError(''); setResetSent(false) }}
            style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
            ← ログインに戻る
          </button>
        </form>
      ) : (
        <form onSubmit={submit} style={formStyle}>
          <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} autoFocus style={{ fontSize: 16 }} />
          <input type="password" placeholder="パスワード（6文字以上）" value={password} onChange={e => setPassword(e.target.value)} style={{ fontSize: 16 }} />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading || !email || !password} style={btnStyle(loading || !email || !password)}>
            {loading ? '処理中...' : tab === 'login' ? 'ログイン' : 'アカウント作成'}
          </button>
          {tab === 'login' && (
            <button type="button" onClick={() => { setTab('reset'); setError('') }}
              style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
              パスワードを忘れた方はこちら
            </button>
          )}
        </form>
      )}
    </div>
  )
}

const containerStyle = {
  minHeight: '100svh',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '0 32px', background: 'var(--bg)'
}

const formStyle = {
  width: '100%', maxWidth: 320,
  display: 'flex', flexDirection: 'column', gap: 12
}

const btnStyle = (disabled) => ({
  padding: '14px',
  background: 'var(--accent)', color: '#0F0F0F',
  borderRadius: 12, fontWeight: 700, fontSize: 16,
  opacity: disabled ? 0.6 : 1
})
