import { useState } from 'react'
import { coursesApi } from '../../api/client'

const COLORS = ['#00ffff', '#9d00ff', '#39ff14', '#ff6600', '#ff003c', '#ffee00']

export default function CreateCourseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('#00ffff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await coursesApi.create({ title: title.trim(), description, category, color })
      onCreated()
    } catch {
      setError('Failed to create course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 'var(--space-5)' }}>Create Course</h3>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Programming, Design" />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                    boxShadow: color === c ? `0 0 12px ${c}` : 'none',
                    border: color === c ? `2px solid white` : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
