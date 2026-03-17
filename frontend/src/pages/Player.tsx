import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  playerApi, subtitlesApi, notesApi, aiApi,
  type Bookmark, type SubtitleTrack, type Note,
  type AIProvider, type QuizQuestion, type TeachBackGrade,
} from '../api/client'
import VideoPlayer, { type VideoPlayerHandle } from '../components/player/VideoPlayer'
import BookmarkPanel from '../components/player/Bookmarks'
import NoteEditor from '../components/tools/NoteEditor'

type Tab = 'bookmarks' | 'notes' | 'subtitles' | 'ai'
type AiTool = 'summarise' | 'quiz' | 'teachback'

// ── AI Tools panel ─────────────────────────────────────────────────────────

function AiPanel({ contentId }: { contentId: number }) {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [provider, setProvider] = useState('')
  const [tool, setTool] = useState<AiTool>('summarise')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Summarise state
  const [mode, setMode] = useState<'summary' | 'key_points' | 'flashcards'>('summary')
  const [summariseResult, setSummariseResult] = useState<string | null>(null)
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([])
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizNum, setQuizNum] = useState(5)

  // Teach-back state
  const [tbQuestions, setTbQuestions] = useState<string[]>([])
  const [tbIndex, setTbIndex] = useState(0)
  const [tbAnswer, setTbAnswer] = useState('')
  const [tbGrade, setTbGrade] = useState<TeachBackGrade | null>(null)

  useEffect(() => {
    aiApi.providers().then((r) => {
      const enabled = r.data.filter((p) => p.is_enabled)
      setProviders(enabled)
      if (enabled.length > 0) setProvider(enabled[0].provider_name)
    }).catch(() => {})
  }, [])

  const noProviders = providers.length === 0

  const runSummarise = async () => {
    setLoading(true); setError(''); setSummariseResult(null); setFlashcards([])
    try {
      const r = await aiApi.summarise(contentId, provider, mode)
      if (mode === 'flashcards' && r.data.cards) {
        setFlashcards(r.data.cards)
      } else {
        setSummariseResult(r.data.result)
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'AI request failed')
    } finally { setLoading(false) }
  }

  const runQuiz = async () => {
    setLoading(true); setError(''); setQuizQuestions([]); setQuizAnswers({})
    try {
      const r = await aiApi.quizFromContent(contentId, provider, quizNum)
      setQuizQuestions(r.data.questions || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'AI request failed')
    } finally { setLoading(false) }
  }

  const runTeachBackQuestions = async () => {
    setLoading(true); setError(''); setTbQuestions([]); setTbIndex(0); setTbAnswer(''); setTbGrade(null)
    try {
      const r = await aiApi.teachBackQuestions(contentId, provider)
      setTbQuestions(r.data.questions || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'AI request failed')
    } finally { setLoading(false) }
  }

  const runGrade = async () => {
    if (!tbQuestions[tbIndex] || !tbAnswer.trim()) return
    setLoading(true); setError(''); setTbGrade(null)
    try {
      const r = await aiApi.gradeTeachBack(tbQuestions[tbIndex], tbAnswer, provider)
      setTbGrade(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'AI request failed')
    } finally { setLoading(false) }
  }

  const nextTbQuestion = () => {
    setTbIndex((i) => Math.min(i + 1, tbQuestions.length - 1))
    setTbAnswer(''); setTbGrade(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Tool selector */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {(['summarise', 'quiz', 'teachback'] as AiTool[]).map((t) => (
          <button
            key={t}
            className={`btn ${tool === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', flex: 1 }}
            onClick={() => { setTool(t); setError('') }}
          >
            {t === 'summarise' ? 'Summarise' : t === 'quiz' ? 'Quiz' : 'Teach-Back'}
          </button>
        ))}
      </div>

      {noProviders ? (
        <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
          <span className="material-icons" style={{ fontSize: 24 }}>settings</span>
          <p style={{ fontSize: 'var(--font-size-sm)' }}>Configure an AI provider in Settings first.</p>
        </div>
      ) : (
        <>
          {/* Provider picker */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <span className="text-xs text-muted">Provider:</span>
            <select
              className="input"
              style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.provider_name} value={p.provider_name}>{p.provider_name} / {p.model_name}</option>
              ))}
            </select>
          </div>

          {/* ── Summarise ── */}
          {tool === 'summarise' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['summary', 'key_points', 'flashcards'] as const).map((m) => (
                  <button
                    key={m}
                    className={`btn ${mode === m ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={() => setMode(m)}
                  >
                    {m === 'summary' ? 'Summary' : m === 'key_points' ? 'Key Points' : 'Flashcards'}
                  </button>
                ))}
              </div>
              <button className="btn btn-primary" style={{ fontSize: 'var(--font-size-xs)' }} onClick={runSummarise} disabled={loading}>
                {loading ? 'Analysing...' : 'Analyse'}
              </button>
              {summariseResult && (
                <div className="card" style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-xs)', lineHeight: 1.7, overflowY: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap' }}>
                  {summariseResult}
                </div>
              )}
              {flashcards.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {flashcards.map((fc, i) => (
                    <div key={i} className="card" style={{ padding: 'var(--space-3)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }} onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}>
                      {flipped[i] ? (
                        <span style={{ color: 'var(--green)' }}>{fc.back}</span>
                      ) : (
                        <span style={{ color: 'var(--cyan)' }}>{fc.front}</span>
                      )}
                    </div>
                  ))}
                  <span className="text-xs text-muted">Click a card to reveal the answer</span>
                </div>
              )}
            </div>
          )}

          {/* ── Quiz ── */}
          {tool === 'quiz' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <span className="text-xs text-muted">Questions:</span>
                <input
                  type="number" min={3} max={15}
                  className="input" style={{ width: 60, padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                  value={quizNum}
                  onChange={(e) => setQuizNum(Number(e.target.value))}
                />
              </div>
              <button className="btn btn-primary" style={{ fontSize: 'var(--font-size-xs)' }} onClick={runQuiz} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Quiz'}
              </button>
              {quizQuestions.map((q, qi) => (
                <div key={qi} className="card" style={{ padding: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-2)', color: 'var(--cyan)' }}>
                    Q{qi + 1}. {q.question}
                  </div>
                  {q.options.map((opt, oi) => {
                    const answered = quizAnswers[qi] !== undefined
                    const isCorrect = oi === q.correct
                    const isSelected = quizAnswers[qi] === oi
                    let bg = 'transparent'
                    if (answered && isCorrect) bg = 'var(--green-dim, #39ff1422)'
                    if (answered && isSelected && !isCorrect) bg = 'var(--red-dim, #ff00441a)'
                    return (
                      <div
                        key={oi}
                        onClick={() => { if (!answered) setQuizAnswers((a) => ({ ...a, [qi]: oi })) }}
                        style={{
                          padding: '4px 8px', marginBottom: 2, borderRadius: 4,
                          background: bg,
                          border: `1px solid ${answered && isCorrect ? 'var(--green)' : answered && isSelected ? 'var(--red)' : 'transparent'}`,
                          fontSize: 11, cursor: answered ? 'default' : 'pointer',
                          color: isSelected || (answered && isCorrect) ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                      >
                        {opt}
                      </div>
                    )
                  })}
                  {quizAnswers[qi] !== undefined && (
                    <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>{q.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Teach-Back ── */}
          {tool === 'teachback' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {tbQuestions.length === 0 ? (
                <button className="btn btn-primary" style={{ fontSize: 'var(--font-size-xs)' }} onClick={runTeachBackQuestions} disabled={loading}>
                  {loading ? 'Generating...' : 'Get Questions'}
                </button>
              ) : (
                <>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Question {tbIndex + 1} / {tbQuestions.length}
                  </div>
                  <div className="card" style={{ padding: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--cyan)', fontWeight: 600 }}>
                    {tbQuestions[tbIndex]}
                  </div>
                  <textarea
                    className="input"
                    style={{ fontSize: 'var(--font-size-xs)', minHeight: 80, resize: 'vertical' }}
                    placeholder="Type your answer here..."
                    value={tbAnswer}
                    onChange={(e) => setTbAnswer(e.target.value)}
                  />
                  <button className="btn btn-primary" style={{ fontSize: 'var(--font-size-xs)' }} onClick={runGrade} disabled={loading || !tbAnswer.trim()}>
                    {loading ? 'Grading...' : 'Submit Answer'}
                  </button>
                  {tbGrade && (
                    <div className="card" style={{ padding: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                        <span className="text-xs text-muted">Score:</span>
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} style={{ fontSize: 14, color: s <= tbGrade.score ? 'var(--cyan)' : 'var(--border)' }}>★</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 'var(--space-2)', color: 'var(--text-muted)' }}>{tbGrade.feedback}</div>
                      <details style={{ fontSize: 10 }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>Model answer</summary>
                        <div style={{ marginTop: 4, color: 'var(--green)' }}>{tbGrade.model_answer}</div>
                      </details>
                      {tbIndex + 1 < tbQuestions.length && (
                        <button className="btn btn-ghost" style={{ marginTop: 'var(--space-3)', fontSize: 10, width: '100%' }} onClick={nextTbQuestion}>
                          Next Question →
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 11 }}>⚠ {error}</div>
      )}
    </div>
  )
}

// ── Main Player page ───────────────────────────────────────────────────────

export default function Player() {
  const { contentId } = useParams<{ contentId: string }>()
  const id = Number(contentId)

  const [progress, setProgress] = useState({ last_position_seconds: 0, completed: false })
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('bookmarks')
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeStatus, setTranscribeStatus] = useState('')
  const pollRef = useRef<number>()
  const playerRef = useRef<VideoPlayerHandle>(null)

  // Voice note recording
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    playerApi.getProgress(id).then((r) => setProgress(r.data)).catch(() => {})
    playerApi.getBookmarks(id).then((r) => setBookmarks(r.data)).catch(() => {})
    subtitlesApi.list(id).then((r) => setSubtitles(r.data)).catch(() => {})
    notesApi.list({ content_id: id }).then((r) => setNotes(r.data)).catch(() => {})
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [id])

  const handleProgress = async (posSeconds: number, delta: number) => {
    try {
      await playerApi.updateProgress(id, { position_seconds: posSeconds, watch_seconds_delta: delta })
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

  const handleAutoGenerate = async () => {
    try {
      await subtitlesApi.generate(id)
      setTranscribing(true)
      setTranscribeStatus('Processing...')
      pollRef.current = window.setInterval(async () => {
        try {
          const r = await subtitlesApi.transcriptionStatus(id)
          const s = r.data.status
          setTranscribeStatus(s)
          if (s === 'done' || s === 'completed') {
            clearInterval(pollRef.current)
            setTranscribing(false)
            subtitlesApi.list(id).then((r) => setSubtitles(r.data)).catch(() => {})
          } else if (s === 'error' || s === 'failed') {
            clearInterval(pollRef.current)
            setTranscribing(false)
          }
        } catch {
          clearInterval(pollRef.current)
          setTranscribing(false)
        }
      }, 5000)
    } catch {}
  }

  const handleVoiceNote = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition not supported in this browser (try Chrome).')
      return
    }
    setRecording(true)
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = async (event: any) => {
      const transcript: string = event.results[0][0].transcript
      const ts = playerRef.current?.currentTime?.() ?? 0
      try {
        const note = await notesApi.create({
          content_id: id,
          title: `Voice note @ ${Math.floor(ts / 60)}:${String(Math.floor(ts % 60)).padStart(2, '0')}`,
          body_markdown: transcript,
          video_timestamp_seconds: ts,
        })
        setNotes((prev) => [note.data, ...prev])
        setActiveTab('notes')
      } catch {}
    }
    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)
    recognition.start()
  }

  const subtitleUrls = subtitles.map((s) => ({
    src: subtitlesApi.serveUrl(s.id),
    label: `${s.language_code}${s.is_auto_generated ? ' (auto)' : ''}`,
    srclang: s.language_code,
  }))

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark' },
    { id: 'notes',     label: 'Notes',     icon: 'edit_note' },
    { id: 'subtitles', label: 'Subtitles', icon: 'closed_caption' },
    { id: 'ai',        label: 'AI Tools',  icon: 'auto_awesome' },
  ]

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

        {/* Subtitle controls */}
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="text-xs text-muted">Subtitles:</span>
          <label className="btn btn-ghost" style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: 14 }}>upload</span>
            Upload SRT/VTT
            <input
              type="file" accept=".srt,.vtt" style={{ display: 'none' }}
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
            onClick={handleAutoGenerate}
            disabled={transcribing}
          >
            <span className="material-icons" style={{ fontSize: 14 }}>auto_fix_high</span>
            {transcribing ? `Transcribing (${transcribeStatus})` : 'Auto-generate'}
          </button>
          <button
            className={`btn ${recording ? 'btn-danger' : 'btn-ghost'}`}
            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px' }}
            onClick={handleVoiceNote}
            disabled={recording}
            title="Record a voice note (speech-to-text)"
          >
            <span className="material-icons" style={{ fontSize: 14 }}>{recording ? 'mic' : 'mic_none'}</span>
            {recording ? 'Listening...' : 'Voice Note'}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
          {TABS.map(({ id: tabId, label, icon }) => (
            <button
              key={tabId}
              className={`btn ${activeTab === tabId ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 10, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setActiveTab(tabId)}
            >
              <span className="material-icons" style={{ fontSize: 12 }}>{icon}</span>
              {label}
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

        {activeTab === 'ai' && <AiPanel contentId={id} />}
      </div>
    </div>
  )
}
