import { type FormEvent, useEffect, useRef, useState } from 'react'
import { api, coursesApi, type Module } from '../../api/client'

export default function UploadModal({ courseId, onClose, onUploaded }: {
  courseId: number; onClose: () => void; onUploaded: () => void
}) {
  const [modules, setModules] = useState<Module[]>([])
  const [moduleId, setModuleId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<'video' | 'document'>('video')
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
    if (!file || !moduleId || !title.trim()) return
    setUploading(true)
    setError('')

    const form = new FormData()
    form.append('module_id', String(moduleId))
    form.append('title', title.trim())
    form.append('file', file)

    try {
      await api.post(`/upload/${type}`, form, {
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
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
              <button type="button" className={`btn ${type === 'video' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setType('video')}>
                <span className="material-icons" style={{ fontSize: 16 }}>videocam</span> Video
              </button>
              <button type="button" className={`btn ${type === 'document' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setType('document')}>
                <span className="material-icons" style={{ fontSize: 16 }}>description</span> Document
              </button>
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

          {uploading && (
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
            <button type="submit" className="btn btn-primary" disabled={uploading || !file || !moduleId}>
              {uploading ? `Uploading... ${progress}%` : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
