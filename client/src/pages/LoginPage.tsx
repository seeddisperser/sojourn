import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useStore } from '../store'

export default function LoginPage() {
  const [token, setToken] = useState('')
  const [userName, setUserName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useStore(s => s.setUser)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token.trim() || !userName.trim()) {
      setError('Both name and workspace token are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.auth.login(token.trim(), userName.trim())
      setUser(data.userName)
      navigate('/', { replace: true })
    } catch {
      setError('Invalid token. Check with whoever set up Sojourn.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-soil-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-soil-800 tracking-tight">Sojourn</h1>
          <p className="mt-2 text-sm text-soil-500">Enter your name and workspace token to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-soil-700 mb-1">Your name</label>
            <input
              className="input w-full"
              type="text"
              placeholder="Calvin"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-soil-700 mb-1">Workspace token</label>
            <input
              className="input w-full"
              type="password"
              placeholder="Paste your workspace token"
              value={token}
              onChange={e => setToken(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Entering…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
