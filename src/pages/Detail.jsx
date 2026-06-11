import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import useTransactions from '../hooks/useTransactions.js'
import { CATEGORIES, formatAmount, monthLabel, prevMonth, nextMonth, currentMonth } from '../utils/format.js'

const COLORS = ['#4ADE80', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', '#34D399', '#FB923C', '#94A3B8']

export default function Detail() {
  const [month, setMonth] = useState(currentMonth())
  const { summary, loading } = useTransactions(month)
  const isCurrentMonth = month === currentMonth()

  const pieData = summary
    ? Object.entries(summary.byCategory || {})
        .map(([cat, amount]) => ({
          name: CATEGORIES[cat]?.label || cat,
          emoji: CATEGORIES[cat]?.emoji || '📦',
          value: parseFloat(amount.toFixed(2))
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : []

  return (
    <div style={{ flex: 1, paddingBottom: 80, paddingTop: 60 }}>
      {/* 月切り替え */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '16px 20px 24px' }}>
        <button onClick={() => setMonth(prevMonth(month))} style={{ color: 'var(--text-muted)', fontSize: 20 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 500 }}>{monthLabel(month)}</span>
        <button
          onClick={() => setMonth(nextMonth(month))}
          style={{ color: isCurrentMonth ? 'var(--border)' : 'var(--text-muted)', fontSize: 20 }}
          disabled={isCurrentMonth}
        >›</button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>読み込み中...</p>}

      {!loading && pieData.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>データなし</p>
      )}

      {!loading && pieData.length > 0 && (
        <>
          {/* 円グラフ */}
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `$${v.toFixed(2)}`}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* カテゴリ別リスト */}
          <div style={{ padding: '0 16px' }}>
            {pieData.map((item, i) => {
              const total = pieData.reduce((s, d) => s + d.value, 0)
              const pct = total > 0 ? (item.value / total * 100).toFixed(0) : 0

              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: COLORS[i % COLORS.length],
                    flexShrink: 0
                  }} />
                  <span style={{ fontSize: 16 }}>{item.emoji}</span>
                  <span style={{ flex: 1, fontSize: 15 }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--red)' }}>
                    {formatAmount(item.value, 'USD')}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
