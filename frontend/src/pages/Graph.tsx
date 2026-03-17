import { useEffect, useRef, useState } from 'react'
import { graphApi, type GraphNode, type GraphEdge } from '../api/client'

const W = 1200
const H = 800
const CX = W / 2
const CY = H / 2

interface PositionedNode extends GraphNode {
  x: number
  y: number
}

function radialLayout(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  const courses = nodes.filter((n) => n.type === 'course')
  const modules = nodes.filter((n) => n.type === 'module')
  const notes   = nodes.filter((n) => n.type === 'note')

  const pos: Record<string, { x: number; y: number }> = {}

  // Courses — evenly spaced on inner ring
  const courseR = Math.min(180, 60 + courses.length * 22)
  courses.forEach((c, i) => {
    const angle = (2 * Math.PI * i) / Math.max(courses.length, 1) - Math.PI / 2
    pos[c.id] = { x: CX + courseR * Math.cos(angle), y: CY + courseR * Math.sin(angle) }
  })

  // Modules — near their parent course
  const moduleR = courseR + 140
  const modulesByCourse: Record<string, string[]> = {}
  edges
    .filter((e) => e.source.startsWith('course_') && e.target.startsWith('module_'))
    .forEach((e) => {
      ;(modulesByCourse[e.source] = modulesByCourse[e.source] || []).push(e.target)
    })

  Object.entries(modulesByCourse).forEach(([courseId, modIds]) => {
    const cp = pos[courseId]
    if (!cp) return
    const baseAngle = Math.atan2(cp.y - CY, cp.x - CX)
    const spread = Math.min(Math.PI / 2, (modIds.length - 1) * 0.4)
    modIds.forEach((mid, i) => {
      const angle = baseAngle - spread / 2 + (spread * i) / Math.max(modIds.length - 1, 1)
      pos[mid] = {
        x: CX + moduleR * Math.cos(angle),
        y: CY + moduleR * Math.sin(angle),
      }
    })
  })

  // Stray modules (no parent edge)
  modules.filter((m) => !pos[m.id]).forEach((m, i) => {
    const angle = (2 * Math.PI * i) / Math.max(modules.length, 1)
    pos[m.id] = { x: CX + moduleR * Math.cos(angle), y: CY + moduleR * Math.sin(angle) }
  })

  // Notes — outer ring, near parent
  const noteR = moduleR + 120
  const notesByCourse: Record<string, string[]> = {}
  edges
    .filter((e) => e.source.startsWith('course_') && e.target.startsWith('note_'))
    .forEach((e) => {
      ;(notesByCourse[e.source] = notesByCourse[e.source] || []).push(e.target)
    })

  // spread notes around parent course angle
  let noteIndex = 0
  Object.entries(notesByCourse).forEach(([courseId, noteIds]) => {
    const cp = pos[courseId]
    if (!cp) return
    const baseAngle = Math.atan2(cp.y - CY, cp.x - CX)
    const spread = Math.min(Math.PI * 0.6, noteIds.length * 0.2)
    noteIds.forEach((nid, i) => {
      const angle = baseAngle - spread / 2 + (spread * i) / Math.max(noteIds.length - 1, 1)
      pos[nid] = {
        x: CX + noteR * Math.cos(angle),
        y: CY + noteR * Math.sin(angle),
      }
    })
  })

  // Stray notes
  notes.filter((n) => !pos[n.id]).forEach((n) => {
    const angle = (2 * Math.PI * noteIndex++) / Math.max(notes.length, 1)
    pos[n.id] = { x: CX + noteR * Math.cos(angle), y: CY + noteR * Math.sin(angle) }
  })

  return nodes.map((n) => ({ ...n, x: pos[n.id]?.x ?? CX, y: pos[n.id]?.y ?? CY }))
}

export default function Graph() {
  const [nodes, setNodes] = useState<PositionedNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef<{ startX: number; startY: number; panStart: { x: number; y: number } } | null>(null)

  useEffect(() => {
    graphApi
      .get()
      .then((r) => {
        const positioned = radialLayout(r.data.nodes, r.data.edges)
        setNodes(positioned)
        setEdges(r.data.edges)
      })
      .catch(() => setError('Failed to load knowledge graph'))
      .finally(() => setLoading(false))
  }, [])

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.min(3, Math.max(0.3, z - e.deltaY * 0.001)))
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName !== 'svg') return
    dragging.current = { startX: e.clientX, startY: e.clientY, panStart: { ...pan } }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    setPan({
      x: dragging.current.panStart.x + (e.clientX - dragging.current.startX) / zoom,
      y: dragging.current.panStart.y + (e.clientY - dragging.current.startY) / zoom,
    })
  }

  const handleMouseUp = () => { dragging.current = null }

  if (loading) return (
    <div className="page-content">
      <div className="text-muted">Loading knowledge graph...</div>
    </div>
  )

  if (error) return (
    <div className="page-content">
      <div className="text-muted">{error}</div>
    </div>
  )

  if (nodes.length === 0) return (
    <div className="page-content">
      <h1 className="cursor-blink" style={{ marginBottom: 'var(--space-6)' }}>Knowledge Graph</h1>
      <div className="empty-state">
        <span className="material-icons">hub</span>
        <p>No data yet. Create some courses and notes to see the graph.</p>
      </div>
    </div>
  )

  const LABEL_TRUNC = 18
  const trunc = (s: string) => s.length > LABEL_TRUNC ? s.slice(0, LABEL_TRUNC) + '…' : s

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 className="cursor-blink">Knowledge Graph</h2>
          <p className="text-muted text-sm" style={{ marginTop: 'var(--space-1)' }}>
            {nodes.filter((n) => n.type === 'course').length} courses ·{' '}
            {nodes.filter((n) => n.type === 'module').length} modules ·{' '}
            {nodes.filter((n) => n.type === 'note').length} notes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <span className="text-xs text-muted">Scroll to zoom · Drag to pan</span>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
        {[
          { color: '#00ffff', label: 'Course' },
          { color: '#9d00ff', label: 'Module' },
          { color: '#39ff14', label: 'Note' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-xs text-muted">{label}</span>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{ flex: 1, overflow: 'hidden', padding: 0, cursor: dragging.current ? 'grabbing' : 'grab', minHeight: 500 }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`scale(${zoom}) translate(${pan.x} ${pan.y})`}>
            {/* Edges */}
            {edges.map((e, i) => {
              const src = nodeMap[e.source]
              const tgt = nodeMap[e.target]
              if (!src || !tgt || src.id === tgt.id) return null
              const highlight = hovered === src.id || hovered === tgt.id
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={highlight ? '#ffffff44' : '#ffffff18'}
                  strokeWidth={highlight ? 1.5 : 0.8}
                />
              )
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const r = n.type === 'course' ? 22 : n.type === 'module' ? 14 : 9
              const isHovered = hovered === n.id
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x} ${n.y})`}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={isHovered ? r * 1.4 : r}
                    fill={`${n.color}33`}
                    stroke={n.color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{
                      filter: isHovered ? `drop-shadow(0 0 8px ${n.color})` : `drop-shadow(0 0 3px ${n.color}88)`,
                      transition: 'r 0.15s, stroke-width 0.15s',
                    }}
                  />
                  {(isHovered || n.type === 'course') && (
                    <text
                      textAnchor="middle"
                      dy={r + 14}
                      fill={n.color}
                      fontSize={n.type === 'course' ? 11 : 9}
                      fontFamily="monospace"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {trunc(n.label)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Hover info bar */}
      {hovered && nodeMap[hovered] && (
        <div
          className="card"
          style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}
        >
          <div
            style={{
              width: 12, height: 12, borderRadius: '50%',
              background: nodeMap[hovered].color,
              boxShadow: `0 0 8px ${nodeMap[hovered].color}`,
              flexShrink: 0,
            }}
          />
          <span className="badge" style={{ borderColor: nodeMap[hovered].color, color: nodeMap[hovered].color }}>
            {nodeMap[hovered].type}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
            {nodeMap[hovered].label}
          </span>
        </div>
      )}
    </div>
  )
}
