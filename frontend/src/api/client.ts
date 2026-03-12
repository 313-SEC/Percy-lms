/**
 * Axios client with:
 * - Automatic Authorization header injection
 * - 401 redirect to /login (clears tokens)
 * - Token refresh on 401
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
})

// ── Request interceptor — attach access token ─────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor — handle 401 ────────────────────────────────────
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        _logout()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
        const newToken: string = res.data.access_token
        localStorage.setItem('access_token', newToken)
        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        _logout()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

function _logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}

// ── Typed API helpers ─────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/login', { username, password }),
  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),
}

export const coursesApi = {
  list: () => api.get<Course[]>('/courses'),
  get: (id: number) => api.get<CourseDetail>(`/courses/${id}`),
  create: (data: Partial<Course>) => api.post<Course>('/courses', data),
  update: (id: number, data: Partial<Course>) => api.put<Course>(`/courses/${id}`, data),
  delete: (id: number) => api.delete(`/courses/${id}`),
  reorder: (ids: number[]) => api.post('/courses/reorder', { ids }),
  createModule: (courseId: number, data: { title: string; description?: string }) =>
    api.post<Module>(`/courses/${courseId}/modules`, data),
  updateModule: (courseId: number, moduleId: number, data: Partial<Module>) =>
    api.put<Module>(`/courses/${courseId}/modules/${moduleId}`, data),
  deleteModule: (courseId: number, moduleId: number) =>
    api.delete(`/courses/${courseId}/modules/${moduleId}`),
  reorderModules: (courseId: number, ids: number[]) =>
    api.post(`/courses/${courseId}/modules/reorder`, { ids }),
  reorderContent: (moduleId: number, ids: number[]) =>
    api.post(`/courses/modules/${moduleId}/content/reorder`, { ids }),
}

export const playerApi = {
  getProgress: (contentId: number) => api.get<VideoProgress>(`/player/${contentId}/progress`),
  updateProgress: (contentId: number, data: { position_seconds: number; completed?: boolean; watch_seconds_delta?: number }) =>
    api.post<VideoProgress>(`/player/${contentId}/progress`, data),
  getBookmarks: (contentId: number) => api.get<Bookmark[]>(`/player/${contentId}/bookmarks`),
  addBookmark: (contentId: number, data: { timestamp_seconds: number; label: string; note_text?: string }) =>
    api.post<Bookmark>(`/player/${contentId}/bookmarks`, data),
  deleteBookmark: (bookmarkId: number) => api.delete(`/player/bookmarks/${bookmarkId}`),
}

export const notesApi = {
  list: (params?: { content_id?: number; course_id?: number }) => api.get<Note[]>('/notes', { params }),
  get: (id: number) => api.get<Note>(`/notes/${id}`),
  create: (data: Partial<Note>) => api.post<Note>('/notes', data),
  update: (id: number, data: Partial<Note>) => api.put<Note>(`/notes/${id}`, data),
  delete: (id: number) => api.delete(`/notes/${id}`),
}

export const pomodoroApi = {
  start: (data: { session_type?: string; duration_minutes?: number; content_id?: number }) =>
    api.post<PomodoroSession>('/pomodoro/start', data),
  end: (id: number, completed: boolean) => api.post<PomodoroSession>(`/pomodoro/${id}/end`, { completed }),
  stats: () => api.get<PomodoroStats>('/pomodoro/stats'),
}

export const gamificationApi = {
  stats: () => api.get<GamificationStats>('/gamification/stats'),
  achievements: () => api.get<Achievement[]>('/gamification/achievements'),
  history: (limit?: number) => api.get<XPEvent[]>('/gamification/history', { params: { limit } }),
}

export const aiApi = {
  providers: () => api.get<AIProvider[]>('/ai/providers'),
  saveProvider: (data: AIProviderConfig) => api.post<AIProvider>('/ai/providers', data),
  generateCourse: (prompt: string, provider: string, num_modules?: number) =>
    api.post('/ai/generate/course', { prompt, provider, num_modules: num_modules ?? 5 }),
  generateQuiz: (content_text: string, provider: string, num_questions?: number) =>
    api.post('/ai/generate/quiz', { content_text, provider, num_questions: num_questions ?? 5 }),
  summarise: (content_id: number, provider: string, mode = 'summary') =>
    api.post<{ mode: string; result: string }>('/ai/summarise', { content_id, provider, mode }),
  quizFromContent: (content_id: number, provider: string, num_questions = 5) =>
    api.post<{ questions: QuizQuestion[] }>('/ai/generate/quiz/content', { content_id, provider, num_questions }),
  teachBackQuestions: (content_id: number, provider: string) =>
    api.post<{ questions: string[] }>('/ai/teach-back/questions', { content_id, provider }),
  gradeTeachBack: (question: string, user_answer: string, provider: string) =>
    api.post<TeachBackGrade>('/ai/teach-back/grade', { question, user_answer, provider }),
}

export const subtitlesApi = {
  list: (contentId: number) => api.get<SubtitleTrack[]>(`/subtitles/${contentId}`),
  upload: (contentId: number, file: File, language_code = 'en') => {
    const form = new FormData()
    form.append('file', file)
    form.append('language_code', language_code)
    return api.post<SubtitleTrack>(`/subtitles/${contentId}/upload`, form)
  },
  generate: (contentId: number, language_code = 'en') =>
    api.post(`/subtitles/${contentId}/generate`, null, { params: { language_code } }),
  transcriptionStatus: (contentId: number) =>
    api.get<{ content_id: number; status: string }>(`/subtitles/${contentId}/transcription-status`),
  delete: (id: number) => api.delete(`/subtitles/${id}`),
  serveUrl: (id: number) => `${BASE_URL}/subtitles/${id}/serve`,
  transcriptionStatus: (contentId: number) =>
    api.get<{ content_id: number; status: string }>(`/subtitles/${contentId}/transcription-status`),
}

export const searchApi = {
  search: (q: string) => api.get<SearchResults>('/search', { params: { q } }),
}

export const studyHistoryApi = {
  get: (days = 30) => api.get<StudyHistory>('/gamification/study-history', { params: { days } }),
}

// ── Type definitions ──────────────────────────────────────────────────────

export interface Course {
  id: number; title: string; description?: string; category?: string;
  color: string; thumbnail_path?: string; order_index: number;
  created_at: string; updated_at: string;
}

export interface Module {
  id: number; course_id: number; title: string; description?: string; order_index: number;
  contents?: ContentItem[];
}

export interface CourseDetail extends Course { modules: Module[] }

export interface ContentItem {
  id: number; module_id: number; title: string; content_type: string;
  file_path?: string; url?: string; duration_seconds?: number;
  order_index: number; created_at: string;
}

export interface VideoProgress {
  content_id: number; last_position_seconds: number; completed: boolean;
  last_watched_at: string; total_watch_seconds: number;
}

export interface Bookmark {
  id: number; content_id: number; timestamp_seconds: number;
  label: string; note_text?: string; created_at: string;
}

export interface Note {
  id: number; title: string; body_markdown: string; content_id?: number;
  course_id?: number; video_timestamp_seconds?: number;
  created_at: string; updated_at: string;
}

export interface PomodoroSession {
  id: number; session_type: string; duration_minutes: number;
  started_at: string; ended_at?: string; completed: boolean;
}

export interface PomodoroStats {
  today_sessions: number; today_minutes: number;
  total_sessions: number; total_minutes: number;
}

export interface GamificationStats {
  total_xp: number; level: number; xp_in_level: number; xp_to_next_level: number;
  current_streak: number; longest_streak: number; total_study_minutes: number;
}

export interface Achievement {
  achievement_key: string; title: string; description: string;
  icon_name: string; earned_at: string;
}

export interface XPEvent {
  event_type: string; xp_amount: number; description: string; earned_at: string;
}

export interface AIProvider {
  provider_name: string; model_name: string; base_url?: string;
  is_enabled: boolean; has_api_key: boolean;
}

export interface AIProviderConfig {
  provider_name: string; api_key?: string; model_name: string;
  base_url?: string; is_enabled: boolean;
}

export interface SubtitleTrack {
  id: number; content_id: number; language_code: string;
  is_auto_generated: boolean; created_at: string;
}

export interface SearchResults {
  query: string;
  courses: { id: number; title: string; description?: string; color: string }[];
  content: { id: number; title: string; content_type: string; module_id: number; module_title: string; course_id: number }[];
  notes: { id: number; title: string; body_preview: string; content_id?: number; course_id?: number; updated_at: string }[];
}

export interface StudyHistoryDay {
  date: string; xp_earned: number; pomodoro_sessions: number;
}

export interface StudyHistory {
  days: number; history: StudyHistoryDay[];
}
