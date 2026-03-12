import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi, type SearchResults } from '../api/client'

export default function Search() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const doSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    try {
      const r = await searchApi.search(q.trim())
      setResults(r.data)
    } catch {
      setResults({ query: q, courses: [], content: [], notes: [] })
    } finally {
      setLoading(false)
    }
  }

  const total = results ? results.courses.length + results.content.length + results.notes.length : 0

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="cursor-blink">Search</h2>
        <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
          Search across all courses, content, and notes
        </p>
      </div>

      <form onSubmit={doSearch} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Type to search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !q.trim()}>
          <span className="material-icons" style={{ fontSize: 18 }}>search</span>
          Search
        </button>
      </form>

      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--cyan)' }}>
          <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>search</span>
          Searching...
        </div>
      )}

      {results && !loading && (
        <>
          <div style={{ marginBottom: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {total} result{total !== 1 ? 's' : ''} for "{results.query}"
          </div>

          {total === 0 && (
            <div className="empty-state">
              <span className="material-icons">search_off</span>
              <p>No results found.</p>
            </div>
          )}

          {results.courses.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cyan)' }}>
                Courses ({results.courses.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {results.courses.map((c) => (
                  <button
                    key={c.id}
                    className="card"
                    style={{ textAlign: 'left', cursor: 'pointer', borderLeft: `3px solid ${c.color}`, padding: 'var(--space-4)' }}
                    onClick={() => navigate('/courses')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className="material-icons" style={{ color: c.color }}>school</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        {c.description && (
                          <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                            {c.description.slice(0, 120)}{c.description.length > 120 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.content.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cyan)' }}>
                Content ({results.content.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {results.content.map((c) => (
                  <button
                    key={c.id}
                    className="card"
                    style={{ textAlign: 'left', cursor: 'pointer', padding: 'var(--space-4)' }}
                    onClick={() => navigate(`/player/${c.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className="material-icons" style={{ color: 'var(--cyan)' }}>
                        {c.content_type === 'video' ? 'play_circle' : c.content_type === 'link' ? 'link' : 'description'}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                          {c.module_title} · <span style={{ textTransform: 'capitalize' }}>{c.content_type}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.notes.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cyan)' }}>
                Notes ({results.notes.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {results.notes.map((n) => (
                  <button
                    key={n.id}
                    className="card"
                    style={{ textAlign: 'left', cursor: 'pointer', padding: 'var(--space-4)' }}
                    onClick={() => navigate('/notes')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      <span className="material-icons" style={{ color: 'var(--cyan)', marginTop: 2 }}>sticky_note_2</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{n.title}</div>
                        {n.body_preview && (
                          <div className="text-muted text-sm" style={{ marginTop: 4, fontFamily: 'monospace', lineHeight: 1.5 }}>
                            {n.body_preview}{n.body_preview.length >= 200 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
