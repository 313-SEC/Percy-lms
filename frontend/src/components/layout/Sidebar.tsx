import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { reviewApi } from '../../api/client'

const BASE_NAV = [
  { to: '/dashboard', icon: 'dashboard',    label: 'Dashboard' },
  { to: '/courses',   icon: 'school',       label: 'Courses' },
  { to: '/notes',     icon: 'edit_note',    label: 'Notes' },
  { to: '/review',    icon: 'style',        label: 'Review' },
  { to: '/graph',     icon: 'hub',          label: 'Graph' },
  { to: '/search',    icon: 'search',       label: 'Search' },
  { to: '/ai',        icon: 'auto_awesome', label: 'AI Creator' },
  { to: '/settings',  icon: 'settings',     label: 'Settings' },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    reviewApi.due().then((r) => setDueCount(r.data.total_due)).catch(() => {})
    const interval = setInterval(() => {
      reviewApi.due().then((r) => setDueCount(r.data.total_due)).catch(() => {})
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text animate-pulse-text">BLACKSITE</div>
        <div className="logo-sub">ACADEMY IMPLANT</div>
      </div>

      <nav className="sidebar-nav">
        {BASE_NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-icons">{icon}</span>
            {label}
            {to === '/review' && dueCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'var(--cyan)',
                  color: 'var(--bg)',
                  borderRadius: '9999px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  minWidth: '1.3rem',
                  height: '1.3rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {dueCount > 99 ? '99+' : dueCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 'var(--space-3)' }}
          onClick={() => logout()}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>logout</span>
          Logout
        </button>
      </div>
    </aside>
  )
}
