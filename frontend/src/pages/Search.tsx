import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi, type SearchResults } from '../api/client'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    try {
      const r = await searchApi.search(q)
      setResults(r.data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <h1 className="page-title">Search</h1>
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          className="input"
          style={{ width: '100%', fontSize: '1.1rem', padding: '0.75rem 1rem' }}
          placeholder="Search courses, content, notes..."
          value={query}
          onChange={e => { setQuery(e.target.value); doSearch(e.target.value) }}
          autoFocus
        />
      </div>
      {loading && <div className="text-secondary">Searching...</div>}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {results.courses.length > 0 && (
            <section>
              <h2 style={{ color: 'var(--color-cyan)', marginBottom: '0.75rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Courses ({results.courses.length})</h2>
              {results.courses.map(c => (
                <div key={c.id} className="card" style={{ marginBottom: '0.5rem', cursor: 'pointer', borderLeft: `3px solid ${c.color || 'var(--color-cyan)'}` }}
                  onClick={() => navigate('/courses')}>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  {c.description && <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{c.description}</div>}
                </div>
              ))}
            </section>
          )}
          {results.content.length > 0 && (
            <section>
              <h2 style={{ color: 'var(--color-purple)', marginBottom: '0.75rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Content ({results.content.length})</h2>
              {results.content.map(c => (
                <div key={c.id} className="card" style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
                  onClick={() => navigate(`/player/${c.id}`)}>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{c.module_title} · {c.content_type}</div>
                </div>
              ))}
            </section>
          )}
          {results.notes.length > 0 && (
            <section>
              <h2 style={{ color: 'var(--color-green)', marginBottom: '0.75rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notes ({results.notes.length})</h2>
              {results.notes.map(n => (
                <div key={n.id} className="card" style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
                  onClick={() => navigate('/notes')}>
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{n.body_preview}</div>
                </div>
              ))}
            </section>
          )}
          {results.courses.length === 0 && results.content.length === 0 && results.notes.length === 0 && (
            <div className="text-secondary">No results found for "{results.query}"</div>
          )}
        </div>
      )}
    </div>
  )
}
