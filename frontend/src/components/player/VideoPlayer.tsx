import { type MouseEvent, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

interface SubtitleConfig {
  src: string
  label: string
  srclang: string
}

interface Props {
  contentId: number
  startPosition?: number
  subtitles?: SubtitleConfig[]
  onProgress?: (posSeconds: number, deltaSecs: number) => void
  onBookmark?: (timestamp: number) => void
}

const PROGRESS_THROTTLE_MS = 10_000

export interface VideoPlayerHandle {
  seek: (seconds: number) => void
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(
  ({ contentId, startPosition = 0, subtitles = [], onProgress, onBookmark }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [playbackRate, setPlaybackRate] = useState(1)
    const lastProgressTime = useRef(0)
    const lastReportedSecs = useRef(0)
    const hasSeekedToStart = useRef(false)

    useImperativeHandle(ref, () => ({
      seek: (secs) => {
        if (videoRef.current) videoRef.current.currentTime = secs
      },
    }))

    const videoSrc = `/api/content/${contentId}/stream`

    const fmt = (secs: number) => {
      const m = Math.floor(secs / 60)
      const s = Math.floor(secs % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    }

    const handleLoadedMetadata = () => {
      if (!videoRef.current) return
      setDuration(videoRef.current.duration)
      if (!hasSeekedToStart.current && startPosition > 0) {
        videoRef.current.currentTime = startPosition
        hasSeekedToStart.current = true
      }
    }

    const handleTimeUpdate = () => {
      if (!videoRef.current) return
      const t = videoRef.current.currentTime
      setCurrentTime(t)

      const now = Date.now()
      if (now - lastProgressTime.current > PROGRESS_THROTTLE_MS) {
        const delta = t - lastReportedSecs.current
        onProgress?.(t, delta > 0 ? delta : 0)
        lastReportedSecs.current = t
        lastProgressTime.current = now
      }
    }

    const togglePlay = () => {
      if (!videoRef.current) return
      if (playing) { videoRef.current.pause() } else { videoRef.current.play() }
    }

    const handleScrub = (e: MouseEvent<HTMLDivElement>) => {
      if (!videoRef.current || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const pct = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = pct * duration
    }

    const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

    return (
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-player"
          src={videoSrc}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); onProgress?.(currentTime, 0) }}
          volume={volume}
          crossOrigin="use-credentials"
        >
          {subtitles.map((s, i) => (
            <track key={i} kind="subtitles" src={s.src} srcLang={s.srclang} label={s.label} default={i === 0} />
          ))}
        </video>

        {/* Controls */}
        <div className="video-controls">
          {/* Scrub bar */}
          <div
            className="video-progress"
            onClick={handleScrub}
            title="Click to seek"
          >
            <div
              className="video-progress-fill"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>

          {/* Control row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button className="btn btn-ghost" onClick={togglePlay} style={{ padding: '2px 8px' }}>
              <span className="material-icons" style={{ fontSize: 20 }}>
                {playing ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <span className="video-time">
              {fmt(currentTime)} / {fmt(duration)}
            </span>

            {/* Volume */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value)
                setVolume(v)
                if (videoRef.current) videoRef.current.volume = v
              }}
              style={{ width: 70, accentColor: 'var(--cyan)' }}
            />

            {/* Playback speed */}
            <select
              className="input"
              style={{ width: 'auto', padding: '2px 6px', fontSize: 'var(--font-size-xs)' }}
              value={playbackRate}
              onChange={(e) => {
                const r = Number(e.target.value)
                setPlaybackRate(r)
                if (videoRef.current) videoRef.current.playbackRate = r
              }}
            >
              {RATES.map((r) => <option key={r} value={r}>{r}x</option>)}
            </select>

            {/* Bookmark */}
            <button
              className="btn btn-ghost"
              style={{ padding: '2px 8px', marginLeft: 'auto' }}
              onClick={() => onBookmark?.(currentTime)}
              title="Add bookmark at current position"
            >
              <span className="material-icons" style={{ fontSize: 18, color: 'var(--yellow)' }}>
                bookmark_add
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'
export default VideoPlayer
