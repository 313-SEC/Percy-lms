import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  coursesApi,
  type ContentItem,
  type CourseDetail,
  type Module,
} from '../../api/client'

const CONTENT_ICONS: Record<string, string> = {
  video: 'videocam',
  pdf: 'picture_as_pdf',
  document: 'description',
  link: 'link',
}

function ContentRow({
  item,
  onPlay,
  onDelete,
}: {
  item: ContentItem
  onPlay: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const fmt = (secs?: number) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        marginBottom: 'var(--space-2)',
        cursor: 'default',
      }}
    >
      {/* Drag handle */}
      <div className="drag-handle" {...attributes} {...listeners}>
        <span className="material-icons" style={{ fontSize: 16 }}>drag_indicator</span>
      </div>

      {/* Type icon */}
      <span className="material-icons text-cyan" style={{ fontSize: 20 }}>
        {CONTENT_ICONS[item.content_type] ?? 'file_present'}
      </span>

      {/* Title */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{item.title}</div>
        {item.duration_seconds && (
          <div className="text-muted text-xs">{fmt(item.duration_seconds)}</div>
        )}
      </div>

      {/* Actions */}
      {item.content_type === 'video' && (
        <button
          className="btn btn-primary"
          style={{ padding: '4px 12px', fontSize: 'var(--font-size-xs)' }}
          onClick={onPlay}
        >
          <span className="material-icons" style={{ fontSize: 14 }}>play_arrow</span>
          Play
        </button>
      )}
      <button
        className="btn btn-danger"
        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
        onClick={onDelete}
      >
        <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
      </button>
    </div>
  )
}

function ModuleSection({
  courseId,
  module,
  onUpdated,
  onDeleted,
}: {
  courseId: number
  module: Module
  onUpdated: () => void
  onDeleted: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [contents, setContents] = useState<ContentItem[]>(module.contents ?? [])
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(module.title)
  const navigate = useNavigate()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    setContents(module.contents ?? [])
  }, [module.contents])

  const saveTitle = async () => {
    if (!editTitle.trim()) return
    await coursesApi.updateModule(courseId, module.id, { title: editTitle.trim() }).catch(() => {})
    setEditing(false)
    onUpdated()
  }

  const deleteModule = async () => {
    if (!confirm(`Delete module "${module.title}" and all its content?`)) return
    await coursesApi.deleteModule(courseId, module.id).catch(() => {})
    onDeleted()
  }

  const deleteContent = async (contentId: number) => {
    if (!confirm('Delete this content item?')) return
    const { api } = await import('../../api/client')
    await api.delete(`/content/${contentId}`).catch(() => {})
    setContents((prev) => prev.filter((c) => c.id !== contentId))
  }

  const handleContentDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = contents.findIndex((c) => c.id === active.id)
    const newIdx = contents.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(contents, oldIdx, newIdx)
    setContents(reordered)
    await coursesApi.reorderContent(module.id, reordered.map((c) => c.id)).catch(() => {})
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-3)',
        overflow: 'hidden',
      }}
    >
      {/* Module header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          background: 'var(--bg-elevated)',
        }}
      >
        <button
          className="btn btn-ghost"
          style={{ padding: '2px 4px' }}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {editing ? (
          <input
            className="input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus
            style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
          />
        ) : (
          <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--cyan)' }}>
            {module.title}
          </span>
        )}

        <span className="text-muted text-xs">{contents.length} item{contents.length !== 1 ? 's' : ''}</span>

        {editing ? (
          <>
            <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)' }} onClick={saveTitle}>Save</button>
            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)' }} onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setEditing(true)} title="Rename module">
              <span className="material-icons" style={{ fontSize: 14 }}>edit</span>
            </button>
            <button className="btn btn-danger" style={{ padding: '2px 6px' }} onClick={deleteModule} title="Delete module">
              <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
            </button>
          </>
        )}
      </div>

      {/* Content list */}
      {expanded && (
        <div style={{ padding: 'var(--space-3)' }}>
          {contents.length === 0 && (
            <div className="text-muted text-xs" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
              No content yet — upload video or document files
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleContentDragEnd}>
            <SortableContext items={contents.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {contents.map((item) => (
                <ContentRow
                  key={item.id}
                  item={item}
                  onPlay={() => navigate(`/player/${item.id}`)}
                  onDelete={() => deleteContent(item.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

interface Props {
  courseId: number
  onClose: () => void
  onUpload: () => void
}

export default function CourseDetailPanel({ courseId, onClose, onUpload }: Props) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await coursesApi.get(courseId)
      setCourse(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [courseId])

  const createModule = async () => {
    if (!newModuleTitle.trim()) return
    await coursesApi.createModule(courseId, { title: newModuleTitle.trim() }).catch(() => {})
    setNewModuleTitle('')
    setAddingModule(false)
    load()
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="animate-spin material-icons">refresh</span>
      </div>
    )
  }

  if (!course) return null

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleModuleDragEnd = async (event: DragEndEvent) => {
    if (!course) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = course.modules.findIndex((m) => m.id === active.id)
    const newIdx = course.modules.findIndex((m) => m.id === over.id)
    const reordered = arrayMove(course.modules, oldIdx, newIdx)
    setCourse({ ...course, modules: reordered })
    await coursesApi.reorderModules(courseId, reordered.map((m) => m.id)).catch(() => {})
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        marginTop: 'var(--space-4)',
        boxShadow: 'var(--glow-cyan)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h3 style={{ marginBottom: 'var(--space-1)' }}>{course.title}</h3>
          {course.category && <span className="badge badge-cyan">{course.category}</span>}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={onUpload}>
            <span className="material-icons" style={{ fontSize: 16 }}>upload_file</span>
            Upload Content
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            <span className="material-icons" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      </div>

      {/* Add module */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        {addingModule ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              className="input"
              placeholder="Module title..."
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createModule(); if (e.key === 'Escape') setAddingModule(false) }}
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={createModule}>Add</button>
            <button className="btn btn-ghost" onClick={() => setAddingModule(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setAddingModule(true)}>
            <span className="material-icons" style={{ fontSize: 16 }}>add</span>
            Add Module
          </button>
        )}
      </div>

      {/* Modules list */}
      {course.modules.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
          <span className="material-icons">folder_open</span>
          <p>No modules yet. Add a module to organise your content.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
          <SortableContext items={course.modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {course.modules.map((mod) => (
              <ModuleSection
                key={mod.id}
                courseId={courseId}
                module={mod}
                onUpdated={load}
                onDeleted={load}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
