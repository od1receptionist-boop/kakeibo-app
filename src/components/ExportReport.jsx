import { useEffect, useRef } from 'react'
import { CATEGORIES, formatAmount, monthLabel } from '../utils/format.js'

const COLORS = ['#4ADE80','#60A5FA','#FBBF24','#F87171','#A78BFA','#34D399','#FB923C','#94A3B8']

export default function ExportReport({ txList, summary, month, fxRate, userEmail, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'print-override'
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #print-report { display: block !important; }
        @page { size: A4; margin: 20mm 15mm; }
      }
    `
    document.head.appendChild(style)
    return () => document.getElementById('print-override')?.remove()
  }, [])

  const print = () => {
    window.print()
  }

  const total = summary?.totalUSD || 0
  const totalJPY = fxRate ? Math.round(total * fxRate) : null
  const now = new Date()
  const genDate = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`
  const byCategory = summary?.byCategory || {}

  const catRows = Object.entries(byCategory)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1] - a[1])

  return (
    <>
      {/* 画面上のプレビューオーバーレイ */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', overflow: 'auto',
        padding: '20px 0 40px'
      }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={print} style={{
            padding: '10px 28px', background: 'var(--accent)',
            color: '#0F0F0F', borderRadius: 10, fontWeight: 700, fontSize: 15
          }}>PDFに保存</button>
          <button onClick={onClose} style={{
            padding: '10px 20px', background: 'var(--surface)',
            color: 'var(--text)', borderRadius: 10, fontSize: 15
          }}>閉じる</button>
        </div>
        <div ref={ref} style={{
          background: '#fff', color: '#111',
          width: 595, minHeight: 842,
          padding: '40px 48px', fontFamily: "'Noto Sans JP', 'Inter', sans-serif",
          fontSize: 11, lineHeight: 1.6, boxShadow: '0 4px 32px rgba(0,0,0,0.4)'
        }}>
          <ReportContent
            month={month} genDate={genDate} userEmail={userEmail}
            total={total} totalJPY={totalJPY} fxRate={fxRate}
            catRows={catRows} txList={txList}
          />
        </div>
      </div>

      {/* 印刷専用（画面では非表示） */}
      <div id="print-report" style={{ display: 'none',
        fontFamily: "'Noto Sans JP', 'Inter', sans-serif", fontSize: 11, lineHeight: 1.6, color: '#111'
      }}>
        <ReportContent
          month={month} genDate={genDate} userEmail={userEmail}
          total={total} totalJPY={totalJPY} fxRate={fxRate}
          catRows={catRows} txList={txList}
        />
      </div>
    </>
  )
}

function ReportContent({ month, genDate, userEmail, total, totalJPY, fxRate, catRows, txList }) {
  const byCategory = {}
  catRows.forEach(([k,v]) => { byCategory[k] = v })

  return (
    <>
      {/* ヘッダー */}
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>支出明細書</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Expense Report</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>
            <div>作成日: {genDate}</div>
            <div>{userEmail}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600 }}>
          対象期間: {monthLabel(month)}
        </div>
      </div>

      {/* サマリー */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <SummaryBox label="合計支出 (USD)" value={formatAmount(total, 'USD')} accent />
        {totalJPY && <SummaryBox label={`合計支出 (JPY) ※1USD=¥${Math.round(fxRate)}`} value={`¥${totalJPY.toLocaleString()}`} />}
        <SummaryBox label="取引件数" value={`${txList.length}件`} />
      </div>

      {/* カテゴリ別集計 */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>カテゴリ別集計</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <Th>カテゴリ</Th>
              <Th right>金額 (USD)</Th>
              {fxRate && <Th right>金額 (JPY)</Th>}
              <Th right>割合</Th>
            </tr>
          </thead>
          <tbody>
            {catRows.map(([cat, amount], i) => {
              const info = CATEGORIES[cat] || CATEGORIES.other
              const pct = total > 0 ? (amount / total * 100).toFixed(1) : '0.0'
              return (
                <tr key={cat} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8,
                      borderRadius: '50%', background: COLORS[i % COLORS.length],
                      marginRight: 6, verticalAlign: 'middle'
                    }} />
                    {info.emoji} {info.label}
                  </td>
                  <Td right mono>{formatAmount(amount, 'USD')}</Td>
                  {fxRate && <Td right mono>¥{Math.round(amount * fxRate).toLocaleString()}</Td>}
                  <Td right>{pct}%</Td>
                </tr>
              )
            })}
            <tr style={{ borderTop: '2px solid #111', fontWeight: 700 }}>
              <td style={{ padding: '8px 8px' }}>合計</td>
              <Td right mono>{formatAmount(total, 'USD')}</Td>
              {fxRate && <Td right mono>¥{Math.round(total * fxRate).toLocaleString()}</Td>}
              <Td right>100%</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 取引明細 */}
      <div>
        <SectionTitle>取引明細</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <Th>日付</Th>
              <Th>店舗・内容</Th>
              <Th>カテゴリ</Th>
              <Th>区分</Th>
              <Th right>金額 (USD)</Th>
              {fxRate && <Th right>金額 (JPY)</Th>}
            </tr>
          </thead>
          <tbody>
            {txList.map((tx, i) => {
              const info = CATEGORIES[tx.category] || CATEGORIES.other
              const isJPY = tx.currency === 'JPY'
              return (
                <tr key={tx.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ padding: '5px 8px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.merchant}
                  </td>
                  <td style={{ padding: '5px 8px' }}>{info.emoji} {info.label}</td>
                  <td style={{ padding: '5px 8px', fontSize: 9, color: '#666' }}>{sourceLabel(tx.source)}</td>
                  <Td right mono style={{ fontSize: 10 }}>
                    {isJPY ? '—' : formatAmount(tx.amount, 'USD')}
                  </Td>
                  {fxRate && (
                    <Td right mono style={{ fontSize: 10 }}>
                      {isJPY
                        ? formatAmount(tx.amount, 'JPY')
                        : `¥${Math.round(tx.amount * fxRate).toLocaleString()}`}
                    </Td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* フッター */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #ddd', fontSize: 10, color: '#888', textAlign: 'center' }}>
        本明細は家計簿アプリより自動生成されました — {genDate} — {userEmail}
      </div>
    </>
  )
}

function SummaryBox({ label, value, accent }) {
  return (
    <div style={{
      flex: 1, border: `1px solid ${accent ? '#4ADE80' : '#ddd'}`,
      borderRadius: 6, padding: '10px 12px',
      background: accent ? '#f0fff4' : '#fafafa'
    }}>
      <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, marginBottom: 8,
      paddingBottom: 4, borderBottom: '1px solid #ddd'
    }}>{children}</div>
  )
}

function Th({ children, right }) {
  return (
    <th style={{
      padding: '7px 8px', textAlign: right ? 'right' : 'left',
      fontWeight: 600, fontSize: 10, color: '#444'
    }}>{children}</th>
  )
}

function Td({ children, right, mono, style: s }) {
  return (
    <td style={{
      padding: '5px 8px', textAlign: right ? 'right' : 'left',
      fontFamily: mono ? 'monospace' : 'inherit', ...s
    }}>{children}</td>
  )
}

function sourceLabel(source) {
  const map = {
    manual: '手動', tria_notification: 'Tria',
    csv: 'CSV', receipt_ocr: 'レシート',
    recurring: '定期', email: 'メール', webhook: 'Webhook'
  }
  return map[source] || source || '—'
}
