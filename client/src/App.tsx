import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from './api'
import { useStore } from './store'
import { useWebSocket } from './hooks/useWebSocket'
import LoginPage from './pages/LoginPage'
import AppShell from './components/AppShell'
import MissionControl from './pages/MissionControl'
import ArchivePage from './pages/ArchivePage'
import NotaryPage from './pages/NotaryPage'
import WorkshopPage from './pages/WorkshopPage'
import InboxPage from './pages/InboxPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { userName, setUser } = useStore()
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.auth.me()
      .then(data => { setUser(data.userName); setChecking(false) })
      .catch(() => { setUser(null); setChecking(false); navigate('/login') })
  }, [setUser, navigate])

  if (checking) return <div className="flex items-center justify-center h-full text-soil-500">Loading...</div>
  if (!userName) return null
  return <>{children}</>
}

function AuthenticatedApp() {
  useWebSocket()
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MissionControl />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/notary" element={<NotaryPage />} />
        <Route path="/notary/:specId" element={<NotaryPage />} />
        <Route path="/workshop" element={<WorkshopPage />} />
        <Route path="/workshop/:buildId" element={<WorkshopPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <RequireAuth>
          <AuthenticatedApp />
        </RequireAuth>
      } />
    </Routes>
  )
}
