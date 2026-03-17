import type { ReactNode } from 'react'
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
import Search from './pages/Search'
import Review from './pages/Review'
import Graph from './pages/Graph'

function PrivateRoute({ children }: { children: ReactNode }) {
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
        <Route path="search" element={<Search />} />
        <Route path="review" element={<Review />} />
        <Route path="graph" element={<Graph />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
