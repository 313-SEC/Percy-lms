import { useEffect, useState } from 'react'
import { gamificationApi, type GamificationStats } from '../../api/client'

export default function XPHeader() {
  const [stats, setStats] = useState<GamificationStats | null>(null)

  useEffect(() => {
    gamificationApi.stats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  if (!stats) return <div className="header" style={{ justifyContent: 'flex-end' }} />

  const pct = stats.xp_to_next_level > 0
    ? Math.round((stats.xp_in_level / stats.xp_to_next_level) * 100)
    : 100

  return (
    <header className="header">
      {/* Level badge */}
      <div className="level-badge">{stats.level}</div>

      {/* XP bar */}
      <div style={{ flex: 1, maxWidth: 280 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="text-xs text-muted">Level {stats.level}</span>
          <span className="text-xs text-cyan">{stats.total_xp} XP</span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className="material-icons" style={{ color: 'var(--orange)', fontSize: 18 }}>
          local_fire_department
        </span>
        <span className="text-sm text-cyan">{stats.current_streak}d</span>
      </div>

      {/* XP to next level */}
      <span className="text-xs text-muted">
        {stats.xp_in_level} / {stats.xp_to_next_level} XP
      </span>
    </header>
  )
}
