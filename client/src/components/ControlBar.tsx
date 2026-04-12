import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { api } from '../api'

const PLACES = [
  { path: '/', label: 'Mission Control' },
  { path: '/archive', label: 'Archive' },
  { path: '/notary', label: 'Notary' },
  { path: '/workshop', label: 'Workshop' },
]

export default function ControlBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userName, onlineUsers, wsConnected, activeBuildsCount, unreadCount, setUser } = useStore()

  async function handleLogout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
    navigate('/login', { replace: true })
  }

  const initials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-soil-200 shrink-0">
      {/* Place navigation */}
      <nav className="flex items-center gap-1">
        {PLACES.map(p => {
          const active = p.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(p.path)
          return (
            <button
              key={p.path}
              onClick={() => navigate(p.path)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-soil-100 text-soil-800'
                  : 'text-soil-500 hover:text-soil-700 hover:bg-soil-50'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </nav>

      {/* Status indicators */}
      <div className="flex items-center gap-3">
        {activeBuildsCount > 0 && (
          <button
            onClick={() => navigate('/workshop')}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-moss-100 text-moss-700 text-xs font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-moss-500 animate-pulse" />
            {activeBuildsCount} building
          </button>
        )}

        {unreadCount > 0 && (
          <span className="text-xs bg-soil-500 text-white rounded-full px-1.5 py-0.5 font-medium">
            {unreadCount}
          </span>
        )}

        {/* Sync/WS status */}
        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-moss-400' : 'bg-soil-300'}`} title={wsConnected ? 'Connected' : 'Disconnected'} />

        {/* Presence */}
        <div className="flex items-center gap-1">
          {onlineUsers.map(u => (
            <span
              key={u}
              className="w-6 h-6 rounded-full bg-soil-200 flex items-center justify-center text-xs font-semibold text-soil-600"
              title={u}
            >
              {initials(u)}
            </span>
          ))}
        </div>

        {/* Current user */}
        <button
          onClick={handleLogout}
          className="text-xs text-soil-400 hover:text-soil-600 transition-colors"
          title="Click to sign out"
        >
          {userName}
        </button>
      </div>
    </header>
  )
}
