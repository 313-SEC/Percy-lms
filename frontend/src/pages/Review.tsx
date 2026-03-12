import { useEffect, useState } from 'react'
import { reviewApi, type ReviewCardItem } from '../api/client'

type Phase = 'loading' | 'empty' | 'question' | 'answer' | 'done'

export default function Review() {
  const [cards, setCards] = useState<ReviewCardItem[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [totalDue, setTotalDue] = useState(0)
  const [reviewed, setReviewed] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    reviewApi.due().then(r => {
      setCards(r.data.cards)
      setTotalDue(r.data.total_due)
      setPhase(r.data.cards.length === 0 ? 'empty' : 'question')
    }).catch(() => setError('Failed to load review cards'))
  }, [])

  const currentCard = cards[index]

  const grade = async (quality: number) => {
    if (!currentCard) return
    try {
      const r = await reviewApi.grade(currentCard.note_id, quality)
      setXpEarned(prev => prev + r.data.xp_earned)
      setReviewed(prev => prev + 1)
      if (index + 1 >= cards.length) {
        setPhase('done')
      } else {
        setIndex(prev => prev + 1)
        setPhase('question')
      }
    } catch { setError('Failed to grade card') }
  }

  const qualityButtons = [
    { label: 'Again', quality: 1, color: 'var(--red)' },
    { label: 'Hard', quality: 2, color: 'var(--orange)' },
    { label: 'Good', quality: 4, color: 'var(--cyan)' },
    { label: 'Easy', quality: 5, color: 'var(--green)' },
  ]

  if (error) return <div className="page-content"><div className="text-muted">{error}</div></div>

  if (phase === 'loading') return (
    <div className="page-content">
      <div className="text-muted">Loading review session...</div>
    </div>
  )

  if (phase === 'empty') return (
    <div className="page-content">
      <h1 className="cursor-blink" style={{ marginBottom: 'var(--space-6)' }}>Spaced Repetition Review</h1>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <div style={{ color: 'var(--green)', fontSize: '1.2rem', fontWeight: 600 }}>All caught up!</div>
        <div className="text-muted" style={{ marginTop: '0.5rem' }}>No cards due for review. Check back tomorrow.</div>
      </div>
    </div>
  )

  if (phase === 'done') return (
    <div className="page-content">
      <h1 className="cursor-blink" style={{ marginBottom: 'var(--space-6)' }}>Session Complete</h1>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
        <div style={{ color: 'var(--cyan)', fontSize: '1.2rem', fontWeight: 600 }}>
          Reviewed {reviewed} card{reviewed !== 1 ? 's' : ''}
        </div>
        {xpEarned > 0 && (
          <div style={{ color: 'var(--green)', marginTop: '0.5rem' }}>+{xpEarned} XP earned</div>
        )}
        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => {
          setIndex(0); setReviewed(0); setXpEarned(0)
          reviewApi.due().then(r => {
            setCards(r.data.cards)
            setPhase(r.data.cards.length === 0 ? 'empty' : 'question')
          })
        }}>Review More</button>
      </div>
    </div>
  )

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="cursor-blink" style={{ margin: 0 }}>Review</h1>
        <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
          {index + 1} / {cards.length} · {totalDue} due today
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', marginBottom: 'var(--space-6)' }}>
        <div style={{ height: '100%', background: 'var(--cyan)', borderRadius: '2px', width: `${((index) / cards.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* Card */}
      <div className="card" style={{ padding: 'var(--space-6)', minHeight: '200px' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
          Interval: {currentCard.interval_days}d · Rep #{currentCard.repetitions}
        </div>
        <h2 style={{ color: 'var(--cyan)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)' }}>{currentCard.note_title}</h2>

        {phase === 'answer' && (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{currentCard.note_body}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        {phase === 'question' ? (
          <button className="btn btn-primary" onClick={() => setPhase('answer')} style={{ padding: '0.75rem 3rem', fontSize: 'var(--font-size-md)' }}>
            Show Answer
          </button>
        ) : (
          <>
            {qualityButtons.map(btn => (
              <button key={btn.quality} className="btn" onClick={() => grade(btn.quality)}
                style={{ borderColor: btn.color, color: btn.color, minWidth: '80px', padding: '0.6rem 1.2rem' }}>
                {btn.label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
