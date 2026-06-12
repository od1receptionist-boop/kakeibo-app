import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useTransactions from '../hooks/useTransactions.js'
import TxItem from '../components/TxItem.jsx'
import EditModal from '../components/EditModal.jsx'
import { formatAmount, monthLabel, prevMonth, nextMonth, currentMonth, getDefaultCurrency, getUSDtoJPY } from '../utils/format.js'

export default function Home() {
  const [month, setMonth] = useState(currentMonth())
  const { txList, summary, loading, remove, update } = useTransactions(month)
  const [editTx, setEditTx] = useState(null)
  const [fxRate, setFxRate] = useState(null)
  const navigate = useNavigate()
  const isCurrentMonth = month === currentMonth()
  const defCurrency = getDefaultCurrency()
  const primaryTotal = defCurrency === 'JPY' ? (summary?.totalJPY || 0) : (summary?.totalUSD || 0)
  const secondaryTotal = defCurrency === 'JPY' ? (summary?.totalUSD || 0) : (summary?.totalJPY || 0)
  const secondaryCurrency = defCurrency === 'JPY' ? 'USD' : 'JPY'

  useEffect(() => {
    getUSDtoJPY().then(rate => { if (rate) setFxRate(rate) })
  }, [])

  return (
    <div style={{ flex: 1, paddingBottom: 80 }}>
      <div style={{
        padding: '60px 20px 24px',
        background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
          <button onClick={() => setMonth(prevMonth(month))} style={{ color: 'var(--text-muted)', fontSize: 20 }}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{monthLabel(month)}</span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            style={{ color: isCurrentMonth ? 'var(--border)' : 'var(--text-muted)', fontSize: 20 }}
            disabled={isCurrentMonth}
          >›</button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>今月の支出</div>
          {loading ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 42, fontWeight: 600, color: 'var(--text-muted)' }}>—</div>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 42, fontWeight: 600, color: 'var(--red)' }}>
              {formatAmount(primaryTotal, defCurrency)}
            </div>
          )}
          {secondaryTotal > 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-muted)', marginTop: 4 }}>
              + {formatAmount(secondaryTotal, secondaryCurrency)}
            </div>
          )}
          {defCurrency === 'USD' && fxRate && primaryTotal > 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--text-muted)', marginTop: 4 }}>
              ≈ ¥{Math.round(primaryTotal * fxRate).toLocaleString()}
            </div>
          )}
          {summary?.pendingCount > 0 && (
            <div style={{ fontSize: 12, color: 'var(--yellow)', marginTop: 8 }}>
              {summary.pendingCount}件 PENDING含む
            </div>
          )}
        </div>

        {summary && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20 }}>
            <Stat label="件数" value={`${summary.count}件`} />
            <Stat label="1日平均" value={formatAmount(calcDailyAvg(primaryTotal, month), defCurrency)} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>履歴</span>
          <button onClick={() => navigate('/detail')} style={{ fontSize: 13, color: 'var(--accent)' }}>詳細 →</button>
        </div>

        {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>読み込み中...</p>}

        {!loading && txList.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>まだ記録がありません</p>
            <button
              onClick={() => navigate('/add')}
              style={{
                marginTop: 16, padding: '10px 24px',
                background: 'var(--accent)', color: '#0F0F0F',
                borderRadius: 20, fontWeight: 600, fontSize: 14
              }}
            >追加する</button>
          </div>
        )}

        {txList.map(tx => (
          <TxItem
            key={tx.id}
            tx={tx}
            fxRate={fxRate}
            onEdit={setEditTx}
            onDelete={() => remove(tx.id)}
          />
        ))}
      </div>

      {editTx && (
        <EditModal
          tx={editTx}
          onSave={update}
          onClose={() => setEditTx(null)}
        />
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function calcDailyAvg(total, month) {
  const [y, m] = month.split('-').map(Number)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m
  const days = isCurrentMonth ? today.getDate() : new Date(y, m, 0).getDate()
  return days > 0 ? total / days : 0
}
