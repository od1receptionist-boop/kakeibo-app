import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addTransaction, uploadReceipt, importCSV, fetchRecurring, addRecurring, deleteRecurring } from '../utils/api.js'
import { CATEGORIES, getDefaultCurrency } from '../utils/format.js'

const TABS = ['手動', 'レシート', 'CSV', '定期']

export default function Add() {
  const [tab, setTab] = useState(0)
  const navigate = useNavigate()

  return (
    <div style={{ flex: 1, paddingBottom: 80, paddingTop: 60 }}>
      <h2 style={{ padding: '16px 20px 20px', fontSize: 20, fontWeight: 600 }}>追加</h2>

      {/* タブ */}
      <div style={{ display: 'flex', padding: '0 16px', gap: 8, marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: '8px 20px',
              borderRadius: 20,
              background: tab === i ? 'var(--accent)' : 'var(--surface)',
              color: tab === i ? '#0F0F0F' : 'var(--text)',
              fontWeight: tab === i ? 600 : 400,
              fontSize: 14,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >{t}</button>
        ))}
      </div>

      {tab === 0 && <ManualForm onDone={() => navigate('/')} />}
      {tab === 1 && <ReceiptForm onDone={() => navigate('/')} />}
      {tab === 2 && <CSVForm onDone={() => navigate('/')} />}
      {tab === 3 && <RecurringForm />}
    </div>
  )
}

/* ── 手動入力 ── */
function ManualForm({ onDone }) {
  const [form, setForm] = useState({
    amount: '',
    currency: getDefaultCurrency(),
    merchant: '',
    category: 'food',
    date: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.amount || !form.merchant) return
    setLoading(true)
    await addTransaction(form)
    setLoading(false)
    onDone()
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Label>金額</Label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
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
        <input placeholder="IN-N-OUT" value={form.merchant} onChange={e => set('merchant', e.target.value)} />
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

      <Btn onClick={submit} loading={loading}>保存する</Btn>
    </div>
  )
}

/* ── レシートOCR ── */
function ReceiptForm({ onDone }) {
  const [preview, setPreview] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [parsedList, setParsedList] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const pick = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setParsed(null); setParsedList(null); setSelected([])
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setPreview(dataUrl)
      setLoading(true)
      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type || 'image/jpeg'
      const res = await uploadReceipt(base64, mediaType)
      if (res.parsedList) {
        setParsedList(res.parsedList)
        setSelected(res.parsedList.map((_, i) => i))
      } else {
        setParsed(res.parsed || null)
      }
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    if (parsedList) {
      const toSave = parsedList.filter((_, i) => selected.includes(i))
      await Promise.all(toSave.map(tx => addTransaction({ ...tx, source: 'receipt_ocr' })))
    } else if (parsed) {
      await addTransaction({ ...parsed, source: 'receipt_ocr' })
    }
    setSaving(false)
    onDone()
  }

  const toggleSelect = (i) => {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 8, height: 160,
        border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
        cursor: 'pointer', color: 'var(--text-muted)'
      }}>
        <span style={{ fontSize: 36 }}>📷</span>
        <span style={{ fontSize: 13 }}>レシート・アプリ履歴スクリーンショット・PDF</span>
        <span style={{ fontSize: 11, color: 'var(--accent)' }}>複数取引も一括認識</span>
        <input type="file" accept="image/*,application/pdf" onChange={pick} style={{ display: 'none' }} />
      </label>

      {preview && <img src={preview} alt="preview" style={{ borderRadius: 8, maxHeight: 180, objectFit: 'contain' }} />}

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>AIが読み取り中...</p>}

      {/* 複数取引リスト */}
      {parsedList && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{parsedList.length}件検出</span>
            <button
              onClick={() => setSelected(selected.length === parsedList.length ? [] : parsedList.map((_, i) => i))}
              style={{ fontSize: 12, color: 'var(--accent)' }}
            >{selected.length === parsedList.length ? '全解除' : '全選択'}</button>
          </div>
          {parsedList.map((tx, i) => (
            <div
              key={i}
              onClick={() => toggleSelect(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                opacity: selected.includes(i) ? 1 : 0.4, cursor: 'pointer'
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                background: selected.includes(i) ? 'var(--accent)' : 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#0F0F0F'
              }}>{selected.includes(i) ? '✓' : ''}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.merchant}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tx.date}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: 'var(--red)', flexShrink: 0 }}>
                {tx.currency === 'JPY' ? `¥${tx.amount}` : `$${tx.amount}`}
              </div>
            </div>
          ))}
          <div style={{ padding: 12 }}>
            <Btn onClick={save} loading={saving} disabled={selected.length === 0}>
              {selected.length}件を保存
            </Btn>
          </div>
        </div>
      )}

      {/* 単票レシート */}
      {parsed && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 16 }}>
          <Row label="店舗" value={parsed.merchant || '—'} />
          <Row label="金額" value={`${parsed.currency === 'JPY' ? '¥' : '$'}${parsed.amount}`} />
          <Row label="日付" value={parsed.date || '—'} />
          <Btn onClick={save} loading={saving} style={{ marginTop: 12 }}>この内容で保存</Btn>
        </div>
      )}
    </div>
  )
}

/* ── CSV取り込み ── */
function CSVForm({ onDone }) {
  const [csvText, setCsvText] = useState('')
  const [cardType, setCardType] = useState('generic')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const submit = async () => {
    if (!csvText.trim()) return
    setLoading(true)
    const res = await importCSV(csvText, cardType)
    setResult(res)
    setLoading(false)
    if (res.success) setTimeout(onDone, 1500)
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>種類</Label>
        <select value={cardType} onChange={e => setCardType(e.target.value)}>
          <option value="generic">クレカ（汎用）</option>
          <option value="paypay">PayPay</option>
        </select>
      </div>
      <div>
        <Label>CSV テキスト貼り付け</Label>
        <textarea
          rows={8}
          placeholder="CSVの内容をここに貼り付け..."
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>
      <Btn onClick={submit} loading={loading}>取り込む</Btn>
      {result?.success && (
        <p style={{ color: 'var(--accent)', textAlign: 'center' }}>✓ {result.count}件を取り込みました</p>
      )}
    </div>
  )
}

/* ── 定期支出管理 ── */
function RecurringForm() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({
    merchant: '', amount: '', currency: getDefaultCurrency(),
    category: 'other', day_of_month: '1'
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetchRecurring().then(r => setList(r.list || []))
  }, [])

  const add = async () => {
    if (!form.merchant || !form.amount) return
    setLoading(true)
    const res = await addRecurring(form)
    if (res.item) setList(prev => [...prev, res.item])
    setForm({ merchant: '', amount: '', currency: getDefaultCurrency(), category: 'other', day_of_month: '1' })
    setLoading(false)
  }

  const remove = async (id) => {
    await deleteRecurring(id)
    setList(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        毎月繰り返す支出を登録。月の初回起動時に自動で追加されます。
      </p>

      {/* 登録済み一覧 */}
      {list.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {list.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{r.merchant}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  毎月{r.day_of_month}日 · {r.currency === 'JPY' ? `¥${r.amount}` : `$${r.amount}`}
                </div>
              </div>
              <button onClick={() => remove(r.id)} style={{ color: 'var(--red)', fontSize: 18, padding: '4px 8px' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* 新規追加フォーム */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Label>新規追加</Label>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Label>金額</Label>
            <input type="number" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 18 }} />
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
          <Label>店舗名 / サービス名</Label>
          <input placeholder="Netflix" value={form.merchant} onChange={e => set('merchant', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Label>カテゴリ</Label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 90 }}>
            <Label>引き落とし日</Label>
            <input type="number" min="1" max="31" value={form.day_of_month} onChange={e => set('day_of_month', e.target.value)} />
          </div>
        </div>
        <Btn onClick={add} loading={loading}>追加する</Btn>
      </div>
    </div>
  )
}

/* ── 共通パーツ ── */
function Label({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{children}</div>
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}

function Btn({ children, onClick, loading, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '14px',
        background: 'var(--accent)',
        color: '#0F0F0F',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 16,
        opacity: loading ? 0.6 : 1,
        ...style
      }}
    >
      {loading ? '処理中...' : children}
    </button>
  )
}
