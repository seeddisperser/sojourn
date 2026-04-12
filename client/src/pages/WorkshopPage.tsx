import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useWebSocket } from '../hooks/useWebSocket'
import { useStore } from '../store'

interface BuildSession {
  id: string
  spec_id: string | null
  command: string
  status: string
  started_at: string | null
  updated_at: string
  cost_metrics: string | null
  preview_url: string | null
  created_by: string
}

interface LogLine {
  id: number
  stream: 'stdout' | 'stderr'
  line: string
  timestamp: string
}

interface HingePoint {
  id: string
  description: string
  status: 'open' | 'acknowledged'
  source: 'user' | 'agent'
  created_at: string
  acknowledged_by: string | null
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-amber-100 text-amber-700',
  completed: 'bg-moss-100 text-moss-700',
  failed: 'bg-red-100 text-red-700',
  interrupted: 'bg-soil-100 text-soil-500',
  pending: 'bg-soil-100 text-soil-500',
}

export default function WorkshopPage() {
  const { buildId } = useParams()
  const navigate = useNavigate()
  const userName = useStore(s => s.userName)

  const [builds, setBuilds] = useState<BuildSession[]>([])
  const [activeBuild, setActiveBuild] = useState<BuildSession | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [hingePoints, setHingePoints] = useState<HingePoint[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [hingeInput, setHingeInput] = useState('')
  const [showHingeInput, setShowHingeInput] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const { setActiveBuildsCount } = useStore()

  useEffect(() => {
    api.builds.list().then(data => {
      const list = data as BuildSession[]
      setBuilds(list)
      setActiveBuildsCount(list.filter(b => b.status === 'running').length)
    }).catch(() => {})
  }, [setActiveBuildsCount])

  useEffect(() => {
    const id = buildId ?? builds[0]?.id
    if (!id) return
    api.builds.get(id).then((data: any) => {
      setActiveBuild(data)
      setLogs(data.logs ?? [])
      setHingePoints(data.hinge_points ?? [])
    }).catch(() => {})
  }, [buildId, builds])

  useWebSocket(useCallback((msg) => {
    if (msg.type === 'build_log_line') {
      const p = msg.payload as any
      if (p.build_id === (buildId ?? activeBuild?.id)) {
        setLogs(prev => [...prev, p])
      }
    }
    if (msg.type === 'build_status') {
      const p = msg.payload as any
      setBuilds(prev => prev.map(b => b.id === p.id ? { ...b, status: p.status, cost_metrics: p.cost_metrics ?? b.cost_metrics } : b))
      if (p.id === (buildId ?? activeBuild?.id)) {
        setActiveBuild(prev => prev ? { ...prev, status: p.status } : prev)
        setActiveBuildsCount(builds.filter(b => b.id !== p.id ? b.status === 'running' : p.status === 'running').length)
      }
    }
    if (msg.type === 'hinge_point') {
      const p = msg.payload as any
      if (p.build_session_id === (buildId ?? activeBuild?.id)) {
        setHingePoints(prev => [p, ...prev])
      }
    }
    if (msg.type === 'hinge_point_updated') {
      const p = msg.payload as any
      setHingePoints(prev => prev.map(hp => hp.id === p.id ? { ...hp, ...p } : hp))
    }
  }, [buildId, activeBuild?.id, builds, setActiveBuildsCount]))

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  async function handleStop() {
    if (!activeBuild) return
    await api.builds.stop(activeBuild.id).catch(err => alert(err.message))
  }

  async function handleAcknowledge(hpId: string) {
    if (!activeBuild) return
    await api.builds.acknowledgeHingePoint(activeBuild.id, hpId)
  }

  async function handleAddHingePoint() {
    if (!hingeInput.trim() || !activeBuild) return
    await api.builds.createHingePoint(activeBuild.id, hingeInput.trim())
    setHingeInput('')
    setShowHingeInput(false)
  }

  const costMetrics = activeBuild?.cost_metrics ? JSON.parse(activeBuild.cost_metrics) : null

  return (
    <div className="flex h-full">
      {/* Build list */}
      <div className="w-56 border-r border-soil-200 bg-soil-50 flex flex-col shrink-0">
        <div className="p-3 border-b border-soil-200">
          <span className="text-sm font-semibold text-soil-600">Builds</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {builds.map(b => (
            <button
              key={b.id}
              onClick={() => navigate(`/workshop/${b.id}`)}
              className={`w-full text-left px-3 py-2.5 border-b border-soil-100 transition-colors ${
                b.id === (buildId ?? activeBuild?.id) ? 'bg-white' : 'hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {b.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                <span className={`text-xs px-1.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? ''}`}>
                  {b.status}
                </span>
              </div>
              <div className="text-xs text-soil-500 truncate font-mono">{b.command.slice(0, 30)}</div>
              <div className="text-xs text-soil-300 mt-0.5">
                {b.started_at ? new Date(b.started_at).toLocaleTimeString() : '—'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main panel */}
      {activeBuild ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Build header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-soil-200 bg-white shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[activeBuild.status] ?? ''}`}>
              {activeBuild.status}
            </span>
            <span className="text-xs font-mono text-soil-500 flex-1 truncate">{activeBuild.command}</span>
            {activeBuild.spec_id && (
              <button onClick={() => navigate(`/notary/${activeBuild.spec_id}`)} className="text-xs text-soil-400 hover:text-soil-600">
                ← Spec
              </button>
            )}
            {activeBuild.status === 'running' && (
              <button onClick={handleStop} className="text-xs text-red-500 hover:text-red-700 font-medium">Stop</button>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Log stream */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div
                ref={logRef}
                className="flex-1 overflow-y-auto p-4 bg-soil-900 font-mono text-xs leading-relaxed"
                onScroll={(e) => {
                  const el = e.currentTarget
                  setAutoScroll(el.scrollTop + el.clientHeight >= el.scrollHeight - 40)
                }}
              >
                {logs.length === 0 && <span className="text-soil-500">Waiting for output…</span>}
                {logs.map(l => (
                  <div key={l.id} className={l.stream === 'stderr' ? 'text-amber-400' : 'text-moss-300'}>
                    {l.line}
                  </div>
                ))}
              </div>
              {!autoScroll && (
                <button
                  onClick={() => { setAutoScroll(true); logRef.current && (logRef.current.scrollTop = logRef.current.scrollHeight) }}
                  className="absolute bottom-16 right-8 btn-secondary text-xs shadow"
                >
                  ↓ Scroll to bottom
                </button>
              )}
            </div>

            {/* Right panel: hinge points + cost */}
            <div className="w-64 border-l border-soil-200 flex flex-col shrink-0">
              {/* Cost */}
              {costMetrics && (
                <div className="p-3 border-b border-soil-100">
                  <div className="text-xs font-medium text-soil-500 uppercase tracking-wide mb-1">Cost</div>
                  <div className="text-lg font-semibold text-soil-800">
                    ${costMetrics.total_cost?.toFixed(4) ?? '—'}
                  </div>
                </div>
              )}

              {/* Preview URL */}
              {activeBuild.preview_url && (
                <div className="p-3 border-b border-soil-100">
                  <a href={activeBuild.preview_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-moss-600 hover:underline">
                    Open Preview →
                  </a>
                </div>
              )}

              {/* Hinge points */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-soil-500 uppercase tracking-wide">Hinge Points</span>
                  <button onClick={() => setShowHingeInput(true)} className="text-xs text-soil-400 hover:text-soil-600">+ Flag</button>
                </div>

                {showHingeInput && (
                  <div className="mb-3">
                    <input
                      autoFocus
                      className="input w-full text-xs"
                      placeholder="Describe the decision…"
                      value={hingeInput}
                      onChange={e => setHingeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddHingePoint(); if (e.key === 'Escape') setShowHingeInput(false) }}
                    />
                  </div>
                )}

                {hingePoints.length === 0 && (
                  <p className="text-xs text-soil-300 text-center py-4">No hinge points yet.</p>
                )}
                {hingePoints.map(hp => (
                  <div key={hp.id} className={`mb-2 p-2.5 rounded-lg border ${
                    hp.status === 'acknowledged' ? 'border-soil-100 bg-soil-50 opacity-60' : 'border-amber-200 bg-amber-50'
                  }`}>
                    <div className="flex items-start gap-1.5">
                      <span className={`text-xs px-1 rounded ${hp.source === 'agent' ? 'bg-moss-100 text-moss-600' : 'bg-soil-100 text-soil-600'}`}>
                        {hp.source}
                      </span>
                    </div>
                    <p className="text-xs text-soil-700 mt-1.5 leading-relaxed">{hp.description}</p>
                    {hp.status === 'open' && (
                      <button
                        onClick={() => handleAcknowledge(hp.id)}
                        className="text-xs text-soil-400 hover:text-soil-600 mt-1.5 font-medium"
                      >
                        Acknowledge
                      </button>
                    )}
                    {hp.status === 'acknowledged' && (
                      <div className="text-xs text-soil-300 mt-1">✓ {hp.acknowledged_by}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-soil-300 text-sm">
          No builds yet. Trigger a build from a finalized spec in Notary.
        </div>
      )}
    </div>
  )
}
