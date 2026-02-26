import { useEffect, useRef, useState } from 'react'
import { pomodoroApi } from '../../api/client'
import { useUIStore } from '../../store/uiStore'

type SessionType = 'work' | 'short_break' | 'long_break'

const PRESETS: Record<SessionType, number> = {
  work: 25,
  short_break: 5,
  long_break: 15,
}

const LABELS: Record<SessionType, string> = {
  work: 'Focus',
  short_break: 'Short Break',
  long_break: 'Long Break',
}

export default function PomodoroTimer() {
  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [minutes, setMinutes] = useState(PRESETS.work)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const addToast = useUIStore((s) => s.addToast)

  const totalSeconds = minutes * 60 + seconds
  const totalStart = PRESETS[sessionType] * 60
  const pct = totalStart > 0 ? ((totalStart - totalSeconds) / totalStart) * 100 : 0

  const fmt = (m: number, s: number) =>
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const resetTimer = (type: SessionType = sessionType) => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setMinutes(PRESETS[type])
    setSeconds(0)
    setSessionId(null)
  }

  const start = async () => {
    if (running) return
    try {
      const res = await pomodoroApi.start({ session_type: sessionType, duration_minutes: PRESETS[sessionType] })
      setSessionId(res.data.id)
    } catch {}
    setRunning(true)
  }

  const stop = async (completed = false) => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (sessionId) {
      try {
        await pomodoroApi.end(sessionId, completed)
        if (completed) {
          addToast({ message: `${LABELS[sessionType]} session complete! +15 XP`, type: 'success', icon: 'timer' })
        }
      } catch {}
    }
    resetTimer()
  }

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s === 0) {
          setMinutes((m) => {
            if (m === 0) {
              // Timer done
              stop(true)
              return 0
            }
            return m - 1
          })
          return 59
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const switchType = (type: SessionType) => {
    setSessionType(type)
    resetTimer(type)
  }

  const isWarning = minutes === 0 && seconds <= 10 && running

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      {/* Session type selector */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
        {(Object.keys(PRESETS) as SessionType[]).map((t) => (
          <button
            key={t}
            className={`btn ${sessionType === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => switchType(t)}
            disabled={running}
            style={{ fontSize: 'var(--font-size-xs)' }}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className={`pomodoro-display ${sessionType !== 'work' ? 'break' : ''} ${isWarning ? 'warning' : ''}`}>
        {fmt(minutes, seconds)}
      </div>

      {/* Progress ring (simple bar) */}
      <div className="progress-bar-track" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        {!running ? (
          <button className="btn btn-primary" onClick={start}>
            <span className="material-icons" style={{ fontSize: 18 }}>play_arrow</span>
            Start
          </button>
        ) : (
          <button className="btn btn-danger" onClick={() => stop(false)}>
            <span className="material-icons" style={{ fontSize: 18 }}>stop</span>
            Stop
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => resetTimer()} disabled={running}>
          <span className="material-icons" style={{ fontSize: 18 }}>refresh</span>
          Reset
        </button>
      </div>
    </div>
  )
}
