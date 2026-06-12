import { CATEGORIES, formatAmount, formatDate } from '../utils/format.js'

export default function TxItem({ tx, onDelete, onEdit, fxRate }) {
  const cat = CATEGORIES[tx.category] || CATEGORIES.other
  const showFx = fxRate && tx.currency === 'USD' && tx.amount > 0

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      borderBottom: '1px solid var(--border)',
      opacity: tx.is_pending ? 0.5 : 1
    }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: 10,
        background: 'var(--surface2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0
      }}>
        {cat.emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500, fontSize: 15,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {tx.merchant}
          {tx.is_pending && (
            <span style={{
              marginLeft: 6, fontSize: 10, color: 'var(--yellow)',
              background: 'rgba(251,191,36,0.15)', padding: '2px 6px', borderRadius: 4
            }}>PENDING</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatDate(tx.date)} · {cat.label}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: 'var(--red)' }}>
          -{formatAmount(tx.amount, tx.currency)}
        </div>
        {showFx && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            ≈ ¥{Math.round(tx.amount * fxRate).toLocaleString()}
          </div>
        )}
      </div>

      {onEdit && (
        <button
          onClick={() => onEdit(tx)}
          style={{ color: 'var(--text-muted)', fontSize: 16, padding: '4px 6px' }}
        >✎</button>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(tx.id)}
          style={{ color: 'var(--text-muted)', fontSize: 18, padding: '4px 6px' }}
        >×</button>
      )}
    </div>
  )
}
