import { useUIStore } from '../../store/uiStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type === 'achievement' ? 'achievement' : ''}`}
          onClick={() => removeToast(t.id)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {t.icon && (
              <span className="material-icons" style={{ fontSize: 18, color: 'var(--cyan)' }}>
                {t.icon}
              </span>
            )}
            {t.type === 'achievement' && (
              <span style={{ color: 'var(--purple)', fontWeight: 700 }}>ACHIEVEMENT</span>
            )}
            <span>{t.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
