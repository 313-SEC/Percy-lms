import type { Bookmark } from '../../api/client'

interface Props {
  bookmarks: Bookmark[]
  onSeek: (timestamp: number) => void
  onDelete: (id: number) => void
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function BookmarkPanel({ bookmarks, onSeek, onDelete }: Props) {
  if (bookmarks.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
        <span className="material-icons">bookmark_border</span>
        <p>No bookmarks yet.</p>
        <p className="text-xs" style={{ marginTop: 4 }}>Press the bookmark icon during playback.</p>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: 400 }}>
      {bookmarks.map((b) => (
        <div
          key={b.id}
          className="card hover-glow"
          style={{ marginBottom: 'var(--space-2)', padding: 'var(--space-3)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div onClick={() => onSeek(b.timestamp_seconds)} style={{ flex: 1 }}>
              <span className="badge badge-cyan" style={{ marginRight: 8 }}>
                {fmt(b.timestamp_seconds)}
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)' }}>{b.label}</span>
              {b.note_text && (
                <p className="text-muted text-xs" style={{ marginTop: 4 }}>{b.note_text}</p>
              )}
            </div>
            <button
              className="btn btn-danger"
              style={{ padding: '2px 6px', fontSize: 'var(--font-size-xs)', flexShrink: 0 }}
              onClick={() => onDelete(b.id)}
            >
              <span className="material-icons" style={{ fontSize: 14 }}>close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
