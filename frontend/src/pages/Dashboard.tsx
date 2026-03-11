import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  coursesApi, gamificationApi, pomodoroApi, studyHistoryApi,
  type Course, type GamificationStats, type PomodoroStats, type StudyHistoryDay,
} from '../api/client'
import PomodoroTimer from '../components/tools/PomodoroTimer'

function ActivityChart({ history }: { history: StudyHistoryDay[] }) {
  const maxXP = Math.max(...history.map((d) => d.xp_earned), 1)
  const barWidth = 100 / history.length

  return (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
        <span>{history[0]?.date.slice(5)}</span>
        <span style={{ color: 'var(--cyan)' }}>XP per day (30d)</span>
        <span>{history[history.length - 1]?.date.slice(5)}</span>
      </div>
      <svg
        width="100%"
        height="80"
        viewBox={`0 0 100 80`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        {history.map((day, i) => {
          const barH = (day.xp_earned / maxXP) * 70
          const x = i * barWidth
          const y = 80 - barH
          const isToday = i === history.length - 1
          return (
            <rect
              key={day.date}
              x={x + barWidth * 0.1}
              y={y}
              width={barWidth * 0.8}
              height={barH || 1}
              fill={isToday ? 'var(--cyan)' : day.xp_earned > 0 ? 'rgba(0,255,255,0.4)' : 'rgba(255,255,255,0.05)'}
              rx="0.5"
            />
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
        <span>
          <span style={{ color: 'var(--cyan)' }}>■</span> Today
        </span>
        <span>
          <span style={{ color: 'rgba(0,255,255,0.4)' }}>■</span> Active days
        </span>
        <span>
          Total: {history.reduce((s, d) => s + d.xp_earned, 0).toLocaleString()} XP
        </span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<GamificationStats | null>(null)
  const [pomStats, setPomStats] = useState<PomodoroStats | null>(null)
  const [recentCourses, setRecentCourses] = useState<Course[]>([])
  const [history, setHistory] = useState<StudyHistoryDay[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    gamificationApi.stats().then((r) => setStats(r.data)).catch(() => {})
    pomodoroApi.stats().then((r) => setPomStats(r.data)).catch(() => {})
    coursesApi.list().then((r) => setRecentCourses(r.data.slice(0, 4))).catch(() => {})
    studyHistoryApi.get(30).then((r) => setHistory(r.data.history)).catch(() => {})
  }, [])

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2>
          <span className="cursor-blink">Dashboard</span>
        </h2>
        <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
          Your learning command centre
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="stat-card">
            <div className="stat-value">{stats.level}</div>
            <div className="stat-label">Level</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_xp.toLocaleString()}</div>
            <div className="stat-label">Total XP</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--orange)' }}>{stats.current_streak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>
              {Math.round(stats.total_study_minutes)}
            </div>
            <div className="stat-label">Minutes Studied</div>
          </div>
        </div>
      )}

      {/* Activity chart */}
      {history.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 0 }}>
            <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }}>bar_chart</span>
            Activity (30 days)
          </h3>
          <ActivityChart history={history} />
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Pomodoro */}
        <div>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>
            <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }}>
              timer
            </span>
            Focus Timer
          </h3>
          <PomodoroTimer />
          {pomStats && (
            <div
              className="grid-2"
              style={{ marginTop: 'var(--space-4)', gap: 'var(--space-3)' }}
            >
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)', color: 'var(--green)' }}>
                  {pomStats.today_sessions}
                </div>
                <div className="stat-label">Today's Sessions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)', color: 'var(--green)' }}>
                  {pomStats.today_minutes}m
                </div>
                <div className="stat-label">Today's Focus</div>
              </div>
            </div>
          )}
        </div>

        {/* Recent courses */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3>
              <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }}>
                school
              </span>
              Courses
            </h3>
            <button className="btn btn-ghost text-xs" onClick={() => navigate('/courses')}>
              View all
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentCourses.length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
                <span className="material-icons">school</span>
                No courses yet. Upload your first course!
              </div>
            )}
            {recentCourses.map((c) => (
              <div
                key={c.id}
                className="card hover-glow"
                style={{ padding: 'var(--space-3)', cursor: 'pointer' }}
                onClick={() => navigate('/courses')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: 8,
                      height: 40,
                      borderRadius: 4,
                      background: c.color,
                      boxShadow: `0 0 8px ${c.color}`,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{c.title}</div>
                    {c.category && (
                      <span className="badge badge-cyan" style={{ marginTop: 4 }}>{c.category}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
