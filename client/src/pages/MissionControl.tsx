import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'

interface Summary {
  activeBuilds: number
  openHingePoints: number
  pendingComments: number
  recentBuildStatus: string | null
  totalCost: number
}

export default function MissionControl() {
  const navigate = useNavigate()
  const { unreadCount } = useStore()
  const [summary, setSummary] = useState<Summary>({
    activeBuilds: 0, openHingePoints: 0, pendingComments: 0, recentBuildStatus: null, totalCost: 0,
  })

  useEffect(() => {
    api.builds.list().then(data => {
      const builds = data as Array<{ status: string; cost_metrics: string | null }>
      const active = builds.filter(b => b.status === 'running').length
      const recent = builds[0]?.status ?? null
      const totalCost = builds.reduce((sum: number, b) => {
        const cm = b.cost_metrics ? JSON.parse(b.cost_metrics) : null
        return sum + ((cm as { total_cost?: number } | null)?.total_cost ?? 0)
      }, 0)
      setSummary(s => ({ ...s, activeBuilds: active, recentBuildStatus: recent, totalCost }))
    }).catch(() => {})
  }, [])

  const statusColor = (s: string | null) => {
    if (!s) return 'text-soil-400'
    if (s === 'completed') return 'text-moss-600'
    if (s === 'failed' || s === 'interrupted') return 'text-red-500'
    if (s === 'running') return 'text-amber-600'
    return 'text-soil-400'
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-soil-800 mb-1">Mission Control</h1>
        <p className="text-sm text-soil-400 mb-8">Your work, in one place.</p>

        {/* Graphical map */}
        <div className="relative bg-soil-50 rounded-2xl border border-soil-200 p-8 mb-6" style={{ minHeight: 380 }}>
          {/* Decorative sketch-like background lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" aria-hidden>
            <path d="M 80 60 Q 200 30 320 80 Q 440 130 560 90" stroke="#a87d3e" strokeWidth="1.5" fill="none" strokeDasharray="4 6" />
            <path d="M 40 200 Q 160 170 280 210 Q 400 250 520 200" stroke="#6a8f50" strokeWidth="1" fill="none" strokeDasharray="3 5" />
          </svg>

          {/* Place zones */}
          <div className="relative grid grid-cols-4 gap-6 h-64">
            {/* Archive */}
            <PlaceZone
              name="Archive"
              description="Notes & images"
              emoji="🌿"
              color="moss"
              onClick={() => navigate('/archive')}
            />

            {/* Notary */}
            <PlaceZone
              name="Notary"
              description="Specs & conviction"
              emoji="📜"
              color="soil"
              onClick={() => navigate('/notary')}
            />

            {/* Workshop */}
            <PlaceZone
              name="Workshop"
              description="Builds & activity"
              emoji="⚙️"
              color="amber"
              badge={summary.activeBuilds > 0 ? `${summary.activeBuilds} active` : undefined}
              onClick={() => navigate('/workshop')}
            />

            {/* Inbox */}
            <PlaceZone
              name="Inbox"
              description="Messages & activity"
              emoji="📬"
              color="sky"
              badge={unreadCount > 0 ? `${unreadCount} unread` : undefined}
              onClick={() => navigate('/inbox')}
            />
          </div>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard
            label="Active builds"
            value={summary.activeBuilds}
            onClick={() => navigate('/workshop')}
            highlight={summary.activeBuilds > 0}
          />
          <SummaryCard
            label="Unread"
            value={unreadCount}
            onClick={() => navigate('/inbox')}
          />
          <SummaryCard
            label="Recent build"
            value={summary.recentBuildStatus ?? '—'}
            className={statusColor(summary.recentBuildStatus)}
            onClick={() => navigate('/workshop')}
          />
          <SummaryCard
            label="Total cost"
            value={summary.totalCost > 0 ? `$${summary.totalCost.toFixed(2)}` : '—'}
            onClick={() => navigate('/workshop')}
          />
        </div>
      </div>
    </div>
  )
}

function PlaceZone({ name, description, emoji, color, badge, onClick }: {
  name: string; description: string; emoji: string; color: string; badge?: string; onClick: () => void
}) {
  const borders: Record<string, string> = {
    moss: 'border-moss-300 hover:border-moss-400 bg-moss-50 hover:bg-moss-100',
    soil: 'border-soil-300 hover:border-soil-400 bg-soil-50 hover:bg-soil-100',
    amber: 'border-amber-300 hover:border-amber-400 bg-amber-50 hover:bg-amber-100',
    sky: 'border-sky-300 hover:border-sky-400 bg-sky-50 hover:bg-sky-100',
  }
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 cursor-pointer transition-all p-4 group ${borders[color] ?? borders.soil}`}
      style={{ fontFamily: 'inherit' }}
    >
      {badge && (
        <span className="absolute top-2 right-2 text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5 font-medium">
          {badge}
        </span>
      )}
      <span className="text-3xl mb-2">{emoji}</span>
      <span className="font-semibold text-soil-800 group-hover:text-soil-900">{name}</span>
      <span className="text-xs text-soil-400 mt-0.5">{description}</span>
    </button>
  )
}

function SummaryCard({ label, value, onClick, highlight, className }: {
  label: string; value: string | number; onClick?: () => void; highlight?: boolean; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left hover:shadow-md transition-shadow ${highlight ? 'border-moss-300 bg-moss-50' : ''}`}
    >
      <div className={`text-xl font-semibold ${className ?? 'text-soil-800'}`}>{value}</div>
      <div className="text-xs text-soil-400 mt-0.5">{label}</div>
    </button>
  )
}
