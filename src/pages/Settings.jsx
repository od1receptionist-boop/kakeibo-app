import { useState, useEffect } from 'react'
import { getDefaultCurrency, setDefaultCurrency } from '../utils/format.js'
import { logout, supabase } from '../utils/auth.js'

export default function Settings({ onLogout }) {
  const webhookUrl = `${window.location.origin}/api/webhook`
  const [currency, setCurrency] = useState(getDefaultCurrency)
  const [webhookToken, setWebhookToken] = useState(null)

  useEffect(() => {
    supabase.from('user_profiles').select('webhook_token').single()
      .then(({ data }) => { if (data) setWebhookToken(data.webhook_token) })
  }, [])

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

      {/* Webhook URL */}
      <Section title="🔗 個人Webhook">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>URL</p>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', color: 'var(--accent)', marginBottom: 12 }}>
          {webhookUrl}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>トークン（x-webhook-tokenヘッダーに設定）</p>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', color: 'var(--yellow)' }}>
          {webhookToken || '読み込み中...'}
        </div>
      </Section>

      {/* メール自動取り込み */}
      <Section title="📧 メール自動取り込み（Google Apps Script）">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
          Vpass・JCB・Amex・PayPayなど<b style={{color:'var(--text)'}}>どのカードでも対応</b>。AIがメール文面を解析するためフォーマット不問。
        </p>
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          {[
            ['ANA Visa / Vpass（三井住友）', 'vpass@vpass.ne.jp'],
            ['JCB', 'info@card.jcb.co.jp'],
            ['Amex Japan', 'AmericanExpress@welcome.aexp.com'],
            ['楽天カード', 'rakuten_card@rakuten.co.jp'],
            ['PayPay Card', 'notice@pay-statement.jp'],
            ['その他', '件名に「ご利用のお知らせ」でも可'],
          ].map(([name, addr]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>{name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 11 }}>{addr}</span>
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>※ 実際のアドレスはカード会社からのメールで要確認</p>
        </div>
        <Step n={1} text="script.google.com を開き「新しいプロジェクト」を作成" />
        <Step n={2} text="下記のコードを貼り付けて保存" />
        <Step n={3} text="FROM_FILTERS に使っているカードのアドレスを追加" />
        <Step n={4} text="「実行」→ setupTrigger を実行してGmailアクセスを許可" />
        <Step n={5} text="5分ごとに自動でメールをチェック・登録されます" />
        <div style={{ marginTop: 12, background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.7 }}>
{`const WEBHOOK_URL = "${window.location.origin}/api/email-import";
const WEBHOOK_TOKEN = "${webhookToken || 'YOUR_TOKEN'}";
// 使っているカードのアドレスをここに追加
const FROM_FILTERS = [
  "vpass@vpass.ne.jp",          // ANA Visa (Vpass)
  "info@card.jcb.co.jp",        // JCB
  "AmericanExpress@welcome.aexp.com", // Amex
  // "rakuten_card@rakuten.co.jp",
  // "ご利用のお知らせ",  // 件名キーワードも可
];

function checkNewEmails() {
  const query = FROM_FILTERS
    .map(f => f.includes('@') ? 'from:' + f : 'subject:' + f)
    .join(' OR ');
  const threads = GmailApp.search(
    'is:unread (' + query + ')', 0, 20
  );
  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    const payload = {
      subject: msg.getSubject(),
      body: msg.getPlainBody().slice(0, 2000),
      from: msg.getFrom()
    };
    UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-webhook-token': WEBHOOK_TOKEN },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    thread.markRead();
  });
}

function setupTrigger() {
  ScriptApp.newTrigger('checkNewEmails')
    .timeBased().everyMinutes(5).create();
}`}
        </div>
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
