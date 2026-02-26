import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { playerApi, subtitlesApi, notesApi, type Bookmark, type SubtitleTrack, type Note } from '../api/client'
import VideoPlayer from '../components/player/VideoPlayer'
import BookmarkPanel from '../components/player/Bookmarks'
import NoteEditor from '../components/tools/NoteEditor'

export default function Player() {
  const { contentId } = useParams<{ contentId: string }>()
  const id = Number(contentId)

  const [progress, setProgress] = useState({ last_position_seconds: 0, completed: false })
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'notes' | 'subtitles'>('bookmarks')
  const playerRef = useRef<{ seek: (t: number) => void }>(null)

  useEffect(() => {
    playerApi.getProgress(id).then((r) => setProgress(r.data)).catch(() => {})
    playerApi.getBookmarks(id).then((r) => setBookmarks(r.data)).catch(() => {})
    subtitlesApi.list(id).then((r) => setSubtitles(r.data)).catch(() => {})
    notesApi.list({ content_id: id }).then((r) => setNotes(r.data)).catch(() => {})
  }, [id])

  const handleProgress = async (posSeconds: number, delta: number) => {
    try {
      await playerApi.updateProgress(id, {
        position_seconds: posSeconds,
        watch_seconds_delta: delta,
      })
    } catch {}
  }

  const handleAddBookmark = async (timestamp: number) => {
    const label = prompt('Bookmark label:')
    if (!label) return
    try {
      const res = await playerApi.addBookmark(id, { timestamp_seconds: timestamp, label })
      setBookmarks((prev) => [...prev, res.data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds))
    } catch {}
  }

  const handleDeleteBookmark = async (bookmarkId: number) => {
    await playerApi.deleteBookmark(bookmarkId).catch(() => {})
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
  }

  const subtitleUrls = subtitles.map((s) => ({
    src: subtitlesApi.serveUrl(s.id),
    label: `${s.language_code}${s.is_auto_generated ? ' (auto)' : ''}`,
    srclang: s.language_code,
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-5)', maxWidth: 1400 }}>
      {/* Video */}
      <div>
        <VideoPlayer
          ref={playerRef}
          contentId={id}
          startPosition={progress.last_position_seconds}
          subtitles={subtitleUrls}
          onProgress={handleProgress}
          onBookmark={handleAddBookmark}
        />

        {/* Subtitle upload */}
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <span className="text-xs text-muted">Subtitles:</span>
          <label className="btn btn-ghost" style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: 14 }}>upload</span>
            Upload SRT/VTT
            <input
              type="file"
              accept=".srt,.vtt"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                await subtitlesApi.upload(id, f).catch(() => {})
                subtitlesApi.list(id).then((r) => setSubtitles(r.data)).catch(() => {})
              }}
            />
          </label>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px' }}
            onClick={async () => {
              await subtitlesApi.generate(id)
              alert('Whisper transcription started. Check back in a few minutes.')
            }}
          >
            <span className="material-icons" style={{ fontSize: 14 }}>auto_fix_high</span>
            Auto-generate
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-2)' }}>
          {(['bookmarks', 'notes', 'subtitles'] as const).map((tab) => (
            <button
              key={tab}
              className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px' }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'bookmarks' && (
          <BookmarkPanel
            bookmarks={bookmarks}
            onSeek={(t) => playerRef.current?.seek(t)}
            onDelete={handleDeleteBookmark}
          />
        )}

        {activeTab === 'notes' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <NoteEditor
              contentId={id}
              onNoteSaved={(note) => setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)])}
              getCurrentTime={() => 0}
            />
            <div style={{ marginTop: 'var(--space-4)' }}>
              {notes.map((n) => (
                <div key={n.id} className="card" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{n.title}</div>
                  {n.video_timestamp_seconds != null && (
                    <span
                      className="badge badge-cyan"
                      style={{ cursor: 'pointer', marginTop: 4 }}
                      onClick={() => playerRef.current?.seek(n.video_timestamp_seconds!)}
                    >
                      @ {Math.floor(n.video_timestamp_seconds / 60)}:{String(Math.floor(n.video_timestamp_seconds % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subtitles' && (
          <div>
            {subtitles.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
                <span className="material-icons">closed_caption_off</span>
                No subtitles yet
              </div>
            ) : (
              subtitles.map((s) => (
                <div key={s.id} className="card" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-purple">{s.language_code}</span>
                    {s.is_auto_generated && <span className="badge badge-green" style={{ marginLeft: 4 }}>auto</span>}
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}
                    onClick={async () => {
                      await subtitlesApi.delete(s.id).catch(() => {})
                      setSubtitles((prev) => prev.filter((x) => x.id !== s.id))
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
