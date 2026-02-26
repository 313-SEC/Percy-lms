import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CourseBrowser from './pages/CourseBrowser'
import Player from './pages/Player'
import Notes from './pages/Notes'
import AICreator from './pages/AICreator'
import Settings from './pages/Settings'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<CourseBrowser />} />
        <Route path="player/:contentId" element={<Player />} />
        <Route path="notes" element={<Notes />} />
        <Route path="ai" element={<AICreator />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
