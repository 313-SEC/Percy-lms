import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('Invalid credentials. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ width: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-7)' }}>
          <h1
            className="animate-pulse-text"
            style={{ fontSize: 56, letterSpacing: '0.15em', marginBottom: 'var(--space-2)' }}
          >
            PERCY
          </h1>
          <div className="text-muted text-sm" style={{ letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            Learning OS v1.0
          </div>
        </div>

        <div className="card animate-fade-in">
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: 'var(--space-5)',
            }}
          >
            &gt; Authenticate to continue
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                style={{
                  color: 'var(--red)',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-3)' }}
            >
              {loading ? (
                <span className="animate-spin material-icons" style={{ fontSize: 18 }}>
                  refresh
                </span>
              ) : (
                <>
                  <span className="material-icons" style={{ fontSize: 18 }}>login</span>
                  Access System
                </>
              )}
            </button>
          </form>

          <div
            className="text-muted text-xs"
            style={{ marginTop: 'var(--space-5)', textAlign: 'center' }}
          >
            Default: admin / changeme — change in Settings
          </div>
        </div>
      </div>
    </div>
  )
}
