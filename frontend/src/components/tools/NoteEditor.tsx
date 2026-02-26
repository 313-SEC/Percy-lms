import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notesApi, type Note } from '../../api/client'

interface Props {
  contentId?: number
  courseId?: number
  onNoteSaved?: (note: Note) => void
  getCurrentTime?: () => number
}

export default function NoteEditor({ contentId, courseId, onNoteSaved, getCurrentTime }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const timestamp = getCurrentTime?.()
      const res = await notesApi.create({
        title: title.trim(),
        body_markdown: body,
        content_id: contentId,
        course_id: courseId,
        video_timestamp_seconds: timestamp && timestamp > 0 ? timestamp : undefined,
      })
      onNoteSaved?.(res.data)
      setTitle('')
      setBody('')
    } catch {}
    setSaving(false)
  }

  return (
    <div className="note-editor">
      {/* Toolbar */}
      <div className="note-editor-toolbar">
        <button
          className={`btn ${!preview ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '2px 10px', fontSize: 'var(--font-size-xs)' }}
          onClick={() => setPreview(false)}
        >
          Edit
        </button>
        <button
          className={`btn ${preview ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '2px 10px', fontSize: 'var(--font-size-xs)' }}
          onClick={() => setPreview(true)}
        >
          Preview
        </button>
        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
          Markdown supported
        </span>
      </div>

      {/* Title */}
      <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
        <input
          className="input"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ background: 'transparent', border: 'none', fontSize: 'var(--font-size-md)', fontWeight: 700, padding: 0 }}
        />
      </div>

      {/* Body */}
      <div className="note-editor-content">
        {preview ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || '_Nothing to preview_'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note in Markdown..."
            style={{
              width: '100%',
              minHeight: 200,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              resize: 'none',
              lineHeight: 1.8,
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim()}>
          <span className="material-icons" style={{ fontSize: 16 }}>save</span>
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </div>
  )
}
