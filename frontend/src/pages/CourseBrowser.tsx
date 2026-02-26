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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { coursesApi, type Course } from '../api/client'
import CourseCard from '../components/courses/CourseCard'
import CreateCourseModal from '../components/courses/CreateCourseModal'
import UploadModal from '../components/courses/UploadModal'

function SortableCourse({ course, onSelect, onDelete }: { course: Course; onSelect: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: course.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}>
      <CourseCard
        course={course}
        onSelect={onSelect}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export default function CourseBrowser() {
  const [courses, setCourses] = useState<Course[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showUpload, setShowUpload] = useState<number | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const navigate = useNavigate()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = () => coursesApi.list().then((r) => setCourses(r.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = courses.findIndex((c) => c.id === active.id)
    const newIdx = courses.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(courses, oldIdx, newIdx)
    setCourses(reordered)
    await coursesApi.reorder(reordered.map((c) => c.id)).catch(() => {})
  }

  const deleteCourse = async (id: number) => {
    if (!confirm('Delete this course and all its content?')) return
    await coursesApi.delete(id).catch(() => {})
    load()
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 className="cursor-blink">Courses</h2>
          <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} — drag to reorder
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {selectedCourse && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowUpload(selectedCourse)}
            >
              <span className="material-icons" style={{ fontSize: 18 }}>upload_file</span>
              Upload Content
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <span className="material-icons" style={{ fontSize: 18 }}>add</span>
            New Course
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons">school</span>
          <p>No courses yet.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 'var(--space-4)' }}>
            Create your first course
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={courses.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="grid-3">
              {courses.map((course) => (
                <SortableCourse
                  key={course.id}
                  course={course}
                  onSelect={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
                  onDelete={() => deleteCourse(course.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showCreate && (
        <CreateCourseModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}

      {showUpload !== null && (
        <UploadModal
          courseId={showUpload}
          onClose={() => setShowUpload(null)}
          onUploaded={load}
        />
      )}
    </div>
  )
}
