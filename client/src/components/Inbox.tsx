import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useStore } from '../store'
import { useWebSocket } from '../hooks/useWebSocket'

interface Event {
  id: string
  type: string
  actor: string
  related_artifact_id: string | null
  related_artifact_type: string | null
  message: string
  timestamp: string
  metadata: string | null
}

const EVENT_ICONS: Record<string, string> = {
  note_added: '📝', note_updated: '✏️', image_added: '🖼️',
  comment_posted: '💬', collaborator_comment: '💬',
  spec_created: '📋', spec_revised: '✅',
  build_started: '🔨', build_finished: '✓', build_failed: '✗',
  hinge_point_surfaced: '🔶', cost_threshold_crossed: '💰',
  preview_available: '🔗', agent_message: '🤖',
  user_online: '🟢', user_offline: '⚫',
}

const CRITICAL_TYPES = new Set(['build_failed', 'hinge_point_surfaced'])

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'builds', label: 'Builds' },
  { key: 'comments', label: 'Comments' },
  { key: 'specs', label: 'Specs' },
  { key: 'images', label: 'Images' },
]

const FILTER_TYPES: Record<string, string> = {
  builds: 'build_started,build_finished,build_failed,hinge_point_surfaced,cost_threshold_crossed,preview_available',
  comments: 'comment_posted,collaborator_comment',
  specs: 'spec_created,spec_revised',
  images: 'image_added',
}

export default function Inbox() {
  const [events, setEvents] = useState<Event[]>([])
  const [command, setCommand] = useState('')
  const navigate = useNavigate()
  const { inboxFilter, setInboxFilter, clearUnread } = useStore()
  const listRef = useRef<HTMLDivElement>(null)

  const loadEvents = useCallback((filter: string) => {
    const typeParam = FILTER_TYPES[filter]
    api.events.list({ type: typeParam, limit: 50 }).then(data => {
      setEvents(data.events as Event[])
    }).catch(() => {})
  }, [])

  useEffect(() => { loadEvents(inboxFilter) }, [inboxFilter, loadEvents])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const obs = new IntersectionObserver(() => clearUnread(), { root: el, threshold: 0.1 })
    return () => obs.disconnect()
  }, [clearUnread])

  useWebSocket(useCallback((msg) => {
    if (msg.type === 'event') {
      const ev = msg.payload as Event
      setEvents(prev => [ev, ...prev.slice(0, 99)])
    }
  }, []))

  function handleEventClick(ev: Event) {
    if (!ev.related_artifact_id) return
    const type = ev.related_artifact_type
    if (type === 'note' || type === 'image' || type === 'cluster') navigate('/archive')
    else if (type === 'spec') navigate(`/notary/${ev.related_artifact_id}`)
    else if (type === 'build_session') navigate(`/workshop/${ev.related_artifact_id}`)
  }

  async function handleCommand(e: React.FormEvent) {
    e.preventDefault()
    const cmd = command.trim().toLowerCase()
    setCommand('')

    if (cmd === 'show build status') { navigate('/workshop'); return }
    if (cmd === 'show recent costs') { navigate('/workshop'); return }
    if (cmd === 'surface open hinge points') { navigate('/workshop'); return }
    if (cmd.startsWith('create spec from ')) {
      const clusterName = cmd.replace('create spec from ', '').trim()
      // Simple fuzzy: create spec with that title
      const spec: any = await api.specs.create(clusterName, []).catch(() => null)
      if (spec) navigate(`/notary/${spec.id}`)
      return
    }

    // Unknown command → emit agent_message event via creating a note (fallback)
    setEvents(prev => [{
      id: `local-${Date.now()}`,
      type: 'agent_message',
      actor: 'system',
      related_artifact_id: null,
      related_artifact_type: null,
      message: `Unknown command. Try: show build status, show recent costs, surface open hinge points, create spec from [name]`,
      timestamp: new Date().toISOString(),
      metadata: null,
    }, ...prev])
  }

  return (
    <aside className="w-72 border-r border-soil-200 bg-white flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-soil-200">
        <h2 className="text-xs font-semibold text-soil-500 uppercase tracking-wide">Mission Log</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-soil-100 overflow-x-auto">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setInboxFilter(tab.key)}
            className={`flex-none px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              inboxFilter === tab.key
                ? 'text-soil-800 border-b-2 border-soil-500'
                : 'text-soil-400 hover:text-soil-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event feed */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {events.length === 0 && (
          <div className="p-4 text-xs text-soil-300 text-center">No events yet.</div>
        )}
        {events.map(ev => (
          <EventItem key={ev.id} event={ev} onClick={handleEventClick} />
        ))}
      </div>

      {/* Command input */}
      <form onSubmit={handleCommand} className="border-t border-soil-200 p-3">
        <input
          className="input w-full text-xs"
          placeholder="Command… (show build status)"
          value={command}
          onChange={e => setCommand(e.target.value)}
        />
      </form>
    </aside>
  )
}

function EventItem({ event, onClick }: { event: Event; onClick: (ev: Event) => void }) {
  const icon = EVENT_ICONS[event.type] ?? '·'
  const critical = CRITICAL_TYPES.has(event.type)
  const relTime = getRelativeTime(event.timestamp)

  return (
    <button
      onClick={() => onClick(event)}
      className={`w-full text-left px-3 py-2.5 border-b border-soil-50 hover:bg-soil-50 transition-colors ${
        critical ? 'bg-red-50 hover:bg-red-100 border-red-100' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5 shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1">
            <span className={`text-xs font-medium truncate ${critical ? 'text-red-700' : 'text-soil-700'}`}>
              {event.actor}
            </span>
            <span className="text-xs text-soil-300 shrink-0">{relTime}</span>
          </div>
          <p className={`text-xs leading-snug mt-0.5 line-clamp-2 ${critical ? 'text-red-600' : 'text-soil-500'}`}>
            {event.message}
          </p>
        </div>
      </div>
    </button>
  )
}

function getRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}
