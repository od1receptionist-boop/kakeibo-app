import { useState } from 'react'
import { getDefaultCurrency, setDefaultCurrency } from '../utils/format.js'
import { logout } from '../utils/auth.js'

export default function Settings({ onLogout }) {
  const webhookUrl = `${window.location.origin}/api/webhook`
  const [currency, setCurrency] = useState(getDefaultCurrency)

  const handleCurrency = (c) => {
    setDefaultCurrency(c)
    setCurrency(c)
  }

  const handleLogout = async () => {
    await logout()
    onLogout()
  }

  return (
    <div style={{ flex: 1, paddingBottom: 80, paddingTop: 60 }}>
      <h2 style={{ padding: '16px 20px 24px', fontSize: 20, fontWeight: 600 }}>設定</h2>

      {/* 地域設定 */}
      <Section title="🌏 地域設定">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>デフォルト通貨</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ value: 'USD', label: '🇺🇸 USD（米国）' }, { value: 'JPY', label: '🇯🇵 JPY（日本）' }].map(opt => (
            <button
              key={opt.value}
              onClick={() => handleCurrency(opt.value)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                background: currency === opt.value ? 'var(--accent)' : 'var(--surface2)',
                color: currency === opt.value ? '#0F0F0F' : 'var(--text)',
                fontWeight: currency === opt.value ? 700 : 400,
                fontSize: 14
              }}
            >{opt.label}</button>
          ))}
        </div>
      </Section>

      {/* Triaショートカット設定ガイド */}
      <Section title="📱 Tria 自動連携（iOSショートカット）">
        <Step n={1} text="iPhoneの「ショートカット」アプリを開く" />
        <Step n={2} text="「オートメーション」→「＋」→「個人用オートメーション」" />
        <Step n={3} text="「通知」→「アプリ」→「Tria」を選択" />
        <Step n={4} text="アクション追加:「URLの内容を取得」を選択" />
        <Step n={5} text={`URL: ${webhookUrl}`} mono />
        <Step n={6} text='メソッド: POST / ヘッダー: x-webhook-token: （環境変数の値）' />
        <Step n={7} text='本文（JSON): {"text": "{{通知コンテンツ}}", "source": "tria"}' mono />
      </Section>

      {/* Webhook URL */}
      <Section title="🔗 Webhook URL">
        <div style={{
          background: 'var(--surface2)',
          borderRadius: 8,
          padding: '12px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          wordBreak: 'break-all',
          color: 'var(--accent)'
        }}>
          {webhookUrl}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          環境変数 WEBHOOK_TOKEN を設定して不正アクセスを防いでください。
        </p>
      </Section>

      {/* CSV取り込み方法 */}
      <Section title="📄 CSV取り込み方法">
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <b style={{ color: 'var(--text)' }}>PayPay:</b> アプリ → 残高 → 取引履歴 → 右上「…」→ CSVダウンロード
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8 }}>
          <b style={{ color: 'var(--text)' }}>クレカ:</b> 各カード会社のWebサイトから明細CSVをダウンロード
        </p>
      </Section>

      {/* 環境変数 */}
      <Section title="⚙️ 必要な環境変数（Vercel）">
        {[
          ['ANTHROPIC_API_KEY', 'Claude API キー（レシートOCR）'],
          ['KV_REST_API_URL', 'Vercel KV URL'],
          ['KV_REST_API_TOKEN', 'Vercel KV Token'],
          ['WEBHOOK_TOKEN', 'Webhook認証トークン（任意）']
        ].map(([k, v]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{k}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v}</div>
          </div>
        ))}
      </Section>

      {/* ログアウト */}
      <div style={{ margin: '0 16px 24px' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px',
            background: 'var(--surface)',
            color: 'var(--red)',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            fontSize: 15
          }}
        >ログアウト</button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ margin: '0 16px 24px', background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{title}</h3>
      {children}
    </div>
  )
}

function Step({ n, text, mono }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
      <span style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'var(--surface2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
        color: 'var(--accent)'
      }}>{n}</span>
      <span style={{
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        wordBreak: 'break-all'
      }}>{text}</span>
    </div>
  )
}
