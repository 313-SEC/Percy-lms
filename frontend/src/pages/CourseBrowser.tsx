import { useEffect, useState } from 'react'
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
import CourseDetailPanel from '../components/courses/CourseDetailPanel'

function SortableCourse({
  course,
  selected,
  progress,
  onSelect,
  onDelete,
}: {
  course: Course
  selected: boolean
  progress?: number | null
  onSelect: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: course.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}>
      <CourseCard
        course={course}
        selected={selected}
        progress={progress}
        onSelect={onSelect}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export default function CourseBrowser() {
  const [courses, setCourses] = useState<Course[]>([])
  const [progressMap, setProgressMap] = useState<Record<number, number>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [showUpload, setShowUpload] = useState<number | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = () =>
    coursesApi.list().then((r) => {
      setCourses(r.data)
      // Fetch progress for all courses in parallel
      Promise.all(
        r.data.map((c) =>
          coursesApi.progress(c.id).then((pr) => ({ id: c.id, pct: pr.data.completion_pct })).catch(() => null)
        )
      ).then((results) => {
        const map: Record<number, number> = {}
        results.forEach((res) => { if (res) map[res.id] = res.pct })
        setProgressMap(map)
      })
    }).catch(() => {})

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
    if (selectedCourse === id) setSelectedCourse(null)
    load()
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div>
          <h2 className="cursor-blink">Courses</h2>
          <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} — drag to reorder, click to manage
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <span className="material-icons" style={{ fontSize: 18 }}>add</span>
          New Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons">school</span>
          <p>No courses yet.</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            style={{ marginTop: 'var(--space-4)' }}
          >
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
                  selected={selectedCourse === course.id}
                  progress={progressMap[course.id] ?? null}
                  onSelect={() =>
                    setSelectedCourse(selectedCourse === course.id ? null : course.id)
                  }
                  onDelete={() => deleteCourse(course.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Course detail panel — shown below grid when a course is selected */}
      {selectedCourse !== null && (
        <CourseDetailPanel
          courseId={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onUpload={() => setShowUpload(selectedCourse)}
        />
      )}

      {showCreate && (
        <CreateCourseModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            load()
            setSelectedCourse(id)
          }}
        />
      )}

      {showUpload !== null && (
        <UploadModal
          courseId={showUpload}
          onClose={() => setShowUpload(null)}
          onUploaded={() => {
            // Refresh the detail panel
            const id = selectedCourse
            setSelectedCourse(null)
            setTimeout(() => setSelectedCourse(id), 50)
          }}
        />
      )}
    </div>
  )
}
