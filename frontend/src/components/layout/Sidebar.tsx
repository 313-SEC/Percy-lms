import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard',    label: 'Dashboard' },
  { to: '/courses',   icon: 'school',       label: 'Courses' },
  { to: '/notes',     icon: 'edit_note',    label: 'Notes' },
  { to: '/search',    icon: 'search',       label: 'Search' },
  { to: '/ai',        icon: 'auto_awesome', label: 'AI Creator' },
  { to: '/settings',  icon: 'settings',     label: 'Settings' },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text animate-pulse-text">BLACKSITE</div>
        <div className="logo-sub">ACADEMY IMPLANT</div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-icons">{icon}</span>
            {label}
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
