import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notesApi, type Note } from '../api/client'
import NoteEditor from '../components/tools/NoteEditor'
import { api } from '../api/client'

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const load = () => notesApi.list().then((r) => setNotes(r.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const deleteNote = async (id: number) => {
    if (!confirm('Delete this note?')) return
    await notesApi.delete(id).catch(() => {})
    if (selected?.id === id) setSelected(null)
    load()
  }

  const startEdit = (note: Note) => {
    setEditTitle(note.title)
    setEditBody(note.body_markdown)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!selected) return
    await notesApi.update(selected.id, { title: editTitle, body_markdown: editBody }).catch(() => {})
    setEditing(false)
    load()
    setSelected({ ...selected, title: editTitle, body_markdown: editBody })
  }

  const exportAll = async () => {
    setExportLoading(true)
    try {
      const res = await api.post('/export/notes/bulk', {
        note_ids: notes.map((n) => n.id),
        title: 'BLACKSITE: Academy — All Notes',
        format: 'markdown',
      }, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'blacksite_notes.md'
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setExportLoading(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-5)', maxWidth: 1200, height: 'calc(100vh - 120px)' }}>
      {/* Note list */}
      <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', paddingRight: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3>Notes</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
              onClick={exportAll}
              disabled={exportLoading || notes.length === 0}
              title="Export all as Markdown (for NotebookLM)"
            >
              <span className="material-icons" style={{ fontSize: 14 }}>download</span>
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
              onClick={() => setShowCreate((v) => !v)}
            >
              <span className="material-icons" style={{ fontSize: 14 }}>add</span>
            </button>
          </div>
        </div>

        {showCreate && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <NoteEditor onNoteSaved={(note) => { load(); setSelected(note); setShowCreate(false) }} />
          </div>
        )}

        {notes.length === 0 && !showCreate && (
          <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
            <span className="material-icons">note_add</span>
            No notes yet.
          </div>
        )}

        {notes.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              marginBottom: 'var(--space-2)',
              padding: 'var(--space-3)',
              cursor: 'pointer',
              borderColor: selected?.id === n.id ? 'var(--cyan)' : undefined,
              boxShadow: selected?.id === n.id ? 'var(--glow-cyan)' : undefined,
            }}
            onClick={() => { setSelected(n); setEditing(false) }}
          >
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{n.title}</div>
            <div className="text-muted text-xs">{new Date(n.updated_at).toLocaleDateString()}</div>
            {n.video_timestamp_seconds != null && (
              <span className="badge badge-cyan" style={{ marginTop: 4 }}>
                @ {Math.floor(n.video_timestamp_seconds / 60)}:{String(Math.floor(n.video_timestamp_seconds % 60)).padStart(2, '0')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Note content */}
      <div style={{ overflowY: 'auto' }}>
        {!selected ? (
          <div className="empty-state">
            <span className="material-icons">edit_note</span>
            Select a note to view it
          </div>
        ) : editing ? (
          <div className="note-editor">
            <div className="note-editor-toolbar">
              <button className="btn btn-primary" style={{ padding: '2px 10px', fontSize: 'var(--font-size-xs)' }} onClick={saveEdit}>Save</button>
              <button className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: 'var(--font-size-xs)' }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
            <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
              <input
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ background: 'transparent', border: 'none', fontSize: 'var(--font-size-md)', fontWeight: 700, padding: 0 }}
              />
            </div>
            <div className="note-editor-content">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                style={{ width: '100%', minHeight: 400, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', resize: 'none', lineHeight: 1.8 }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
              <div>
                <h2>{selected.title}</h2>
                <div className="text-muted text-xs" style={{ marginTop: 4 }}>
                  Updated {new Date(selected.updated_at).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-ghost" onClick={() => startEdit(selected)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => deleteNote(selected.id)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>

            <div className="markdown-body card" style={{ padding: 'var(--space-5)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.body_markdown || '_Empty note_'}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
