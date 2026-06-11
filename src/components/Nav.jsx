import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/', icon: '◎', label: 'ホーム' },
  { path: '/detail', icon: '▦', label: '詳細' },
  { path: '/add', icon: '+', label: '追加' },
  { path: '/settings', icon: '⚙', label: '設定' }
]

export default function Nav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 430,
      background: 'rgba(15,15,15,0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100
    }}>
      {TABS.map(tab => {
        const active = pathname === tab.path
        const isAdd = tab.path === '/add'
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              padding: '14px 0 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 20,
              position: 'relative'
            }}
          >
            {isAdd ? (
              <span style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#0F0F0F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 600,
                marginTop: -8
              }}>{tab.icon}</span>
            ) : (
              <span>{tab.icon}</span>
            )}
            <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)' }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
