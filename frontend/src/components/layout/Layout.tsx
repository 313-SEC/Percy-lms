import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import XPHeader from './XPHeader'
import ToastContainer from '../gamification/ToastContainer'

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <XPHeader />
        <main className="page-content page-enter">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
