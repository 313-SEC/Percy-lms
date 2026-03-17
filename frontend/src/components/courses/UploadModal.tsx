import { type FormEvent, useEffect, useRef, useState } from 'react'
import { api, coursesApi, type Module } from '../../api/client'

type UploadType = 'video' | 'document' | 'link' | 'youtube'

export default function UploadModal({ courseId, onClose, onUploaded }: {
  courseId: number; onClose: () => void; onUploaded: () => void
}) {
  const [modules, setModules] = useState<Module[]>([])
  const [moduleId, setModuleId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [type, setType] = useState<UploadType>('video')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    coursesApi.get(courseId).then((r) => {
      setModules(r.data.modules || [])
      if (r.data.modules?.[0]) setModuleId(r.data.modules[0].id)
    }).catch(() => {})
  }, [courseId])

  const upload = async (e: FormEvent) => {
    e.preventDefault()
    if (!moduleId || !title.trim()) return
    if (type !== 'link' && type !== 'youtube' && !file) return
    if ((type === 'link' || type === 'youtube') && !url.trim()) return

    setUploading(true)
    setError('')

    try {
      if (type === 'link' || type === 'youtube') {
        await api.post('/upload/link', { module_id: moduleId, title: title.trim(), url: url.trim() })
      } else {
        const form = new FormData()
        form.append('module_id', String(moduleId))
        form.append('title', title.trim())
        form.append('file', file!)
        await api.post(`/upload/${type}`, form, {
          onUploadProgress: (evt) => {
            if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
          },
        })
      }
      onUploaded()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 'var(--space-5)' }}>Upload Content</h3>

        <form onSubmit={upload}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {([
                { id: 'video',    icon: 'videocam',   label: 'Video' },
                { id: 'document', icon: 'description', label: 'Document' },
                { id: 'link',     icon: 'link',        label: 'Link' },
                { id: 'youtube',  icon: 'smart_display', label: 'YouTube' },
              ] as { id: UploadType; icon: string; label: string }[]).map(({ id: t, icon, label }) => (
                <button
                  key={t}
                  type="button"
                  className={`btn ${type === t ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => { setType(t); setFile(null); setUrl('') }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Module</label>
            {modules.length === 0 ? (
              <p className="text-muted text-sm">No modules yet. Create a module in your course first.</p>
            ) : (
              <select className="input" value={moduleId} onChange={(e) => setModuleId(Number(e.target.value))}>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          {type === 'link' || type === 'youtube' ? (
            <div className="form-group">
              <label className="form-label">
                {type === 'youtube' ? 'YouTube URL' : 'URL'}
              </label>
              <input
                className="input"
                type="url"
                placeholder={type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              {type === 'youtube' && (
                <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Saved as an external link — opens in your browser.
                </p>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">File</label>
              <input
                ref={inputRef}
                type="file"
                accept={type === 'video' ? 'video/*' : '.pdf,.pptx,.docx,.txt,.md'}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setFile(f)
                  if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''))
                }}
                style={{ display: 'none' }}
              />
              <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
                <span className="material-icons" style={{ fontSize: 16 }}>attach_file</span>
                {file ? file.name : 'Choose file'}
              </button>
            </div>
          )}

          {uploading && type !== 'link' && type !== 'youtube' && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>{progress}%</div>
            </div>
          )}

          {error && <div style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={uploading}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !moduleId || ((type === 'link' || type === 'youtube') ? !url.trim() : !file)}
            >
              {uploading
                ? ((type === 'link' || type === 'youtube') ? 'Saving...' : `Uploading... ${progress}%`)
                : ((type === 'link' || type === 'youtube') ? 'Add Link' : 'Upload')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
