import type { Course } from '../../api/client'

interface Props {
  course: Course
  selected?: boolean
  onSelect: () => void
  onDelete: () => void
  dragHandleProps?: Record<string, unknown>
}

export default function CourseCard({ course, selected, onSelect, onDelete, dragHandleProps }: Props) {
  return (
    <div
      className="course-card"
      style={{
        borderColor: selected ? course.color : `${course.color}44`,
        boxShadow: selected ? `0 0 16px ${course.color}55` : undefined,
      }}
      onClick={onSelect}
      role="button"
    >
      {/* Colour accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: course.color,
          boxShadow: `0 0 8px ${course.color}`,
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'var(--space-2)' }}>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 'var(--font-size-md)',
              color: selected ? course.color : 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {course.title}
          </h3>
          {course.category && <span className="badge badge-cyan">{course.category}</span>}
          {course.description && (
            <p
              className="text-muted text-sm"
              style={{ marginTop: 'var(--space-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {course.description}
            </p>
          )}
        </div>

        {/* Drag handle */}
        <div
          className="drag-handle"
          {...dragHandleProps}
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>drag_indicator</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', alignItems: 'center' }}>
        <span className="text-xs text-muted" style={{ flex: 1 }}>
          {selected ? '▲ Managing' : '▼ Click to manage'}
        </span>
        <button
          className="btn btn-danger"
          style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px' }}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
        </button>
      </div>
    </div>
  )
}
