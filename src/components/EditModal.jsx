import { useState } from 'react'
import { CATEGORIES } from '../utils/format.js'

export default function EditModal({ tx, onSave, onClose }) {
  const [form, setForm] = useState({
    amount: tx.amount,
    currency: tx.currency,
    merchant: tx.merchant,
    category: tx.category,
    date: tx.date,
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    await onSave(tx.id, form)
    setLoading(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 16px 40px',
          display: 'flex', flexDirection: 'column', gap: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>取引を編集</span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 22 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Label>金額</Label>
            <input
              type="number" inputMode="decimal"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 20 }}
            />
          </div>
          <div style={{ width: 90 }}>
            <Label>通貨</Label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
        </div>

        <div>
          <Label>店舗名</Label>
          <input value={form.merchant} onChange={e => set('merchant', e.target.value)} />
        </div>

        <div>
          <Label>カテゴリ</Label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>日付</Label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: 14,
            background: 'var(--accent)',
            color: '#0F0F0F',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            opacity: loading ? 0.6 : 1,
            marginTop: 4
          }}
        >{loading ? '保存中...' : '保存する'}</button>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{children}</div>
}
