import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useWebSocket } from '../hooks/useWebSocket'

interface Event {
  id: string
  type: string
  actor: string
  related_artifact_id: string | null
  related_artifact_type: string | null
  message: string
  timestamp: string
}

interface Thread {
  artifact_id: string
  artifact_type: string
  artifact_title: string
  comment_count: number
  last_comment_at: string
  latest_body: string
  latest_author: string
}

interface Comment {
  id: string
  parent_id: string | null
  author: string
  body: string
  created_at: string
}

const SPACE_CONFIG = [
  { key: 'archive', label: 'Archive', emoji: '🌿', description: 'Notes & images', path: '/archive' },
  { key: 'notary', label: 'Notary', emoji: '📜', description: 'Specs & conviction', path: '/notary' },
  { key: 'workshop', label: 'Workshop', emoji: '⚙️', description: 'Builds & activity', path: '/workshop' },
]

const EVENT_ICONS: Record<string, string> = {
  note_added: '📝', note_updated: '✏️', image_added: '🖼️',
  comment_posted: '💬', collaborator_comment: '💬',
  spec_created: '📋', spec_revised: '✅',
  build_started: '🔨', build_finished: '✓', build_failed: '✗',
  hinge_point_surfaced: '🔶', cost_threshold_crossed: '💰',
  preview_available: '🔗', agent_message: '🤖',
}

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function renderBody(body: string): React.ReactNode {
  const parts = body.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-sky-600 font-medium">{part}</span>
      : part
  )
}

export default function InboxPage() {
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null)
  const [spaceEvents, setSpaceEvents] = useState<Event[]>([])
  const [spaceLoading, setSpaceLoading] = useState(false)

  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const selectedThreadRef = useRef<Thread | null>(null)
  const [threadComments, setThreadComments] = useState<Comment[]>([])
  const [threadLoading, setThreadLoading] = useState(false)

  const navigate = useNavigate()

  // Load threads on mount
  useEffect(() => {
    api.comments.threads().then(setThreads).catch(() => {})
  }, [])

  // Load space events when a space is selected
  useEffect(() => {
    if (!selectedSpace) return
    setSpaceLoading(true)
    api.events.list({ place: selectedSpace, limit: 50 })
      .then(data => setSpaceEvents(data.events as Event[]))
      .catch(() => {})
      .finally(() => setSpaceLoading(false))
  }, [selectedSpace])

  // Keep ref in sync for use in WebSocket callback
  useEffect(() => { selectedThreadRef.current = selectedThread }, [selectedThread])

  // Load thread comments when a thread is selected
  useEffect(() => {
    if (!selectedThread) return
    setThreadLoading(true)
    api.comments.list(selectedThread.artifact_id, selectedThread.artifact_type)
      .then(data => setThreadComments(data as Comment[]))
      .catch(() => {})
      .finally(() => setThreadLoading(false))
  }, [selectedThread?.artifact_id])

  // Live updates
  useWebSocket(useCallback((msg: { type: string; payload: unknown }) => {
    const p = msg.payload as Record<string, unknown>
    if (msg.type === 'event') {
      setSpaceEvents(prev => [p as unknown as Event, ...prev.slice(0, 99)])
    }
    if (msg.type === 'comment_posted') {
      const c = p as unknown as Comment & { artifact_id: string; artifact_type: string }
      // Refresh threads list
      api.comments.threads().then(setThreads).catch(() => {})
      // Append comment to open thread if it matches
      const current = selectedThreadRef.current
      if (current?.artifact_id === c.artifact_id && current?.artifact_type === c.artifact_type) {
        setThreadComments(prev => [...prev, c])
      }
    }
  }, []))

  function handleSpaceEventClick(ev: Event) {
    if (!ev.related_artifact_id) return
    const type = ev.related_artifact_type
    if (type === 'note' || type === 'image' || type === 'cluster') navigate('/archive')
    else if (type === 'spec') navigate(`/notary/${ev.related_artifact_id}`)
    else if (type === 'build_session') navigate(`/workshop/${ev.related_artifact_id}`)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Spaces section */}
      <div className="border-b border-soil-200 bg-white shrink-0">
        <div className="px-6 pt-4 pb-2">
          <h2 className="text-xs font-semibold text-soil-500 uppercase tracking-wide mb-3">Spaces</h2>
          <div className="flex gap-3">
            {SPACE_CONFIG.map(space => (
              <button
                key={space.key}
                onClick={() => setSelectedSpace(prev => prev === space.key ? null : space.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                  selectedSpace === space.key
                    ? 'border-soil-400 bg-soil-100 text-soil-800'
                    : 'border-soil-200 bg-soil-50 text-soil-500 hover:border-soil-300 hover:bg-soil-100 hover:text-soil-700'
                }`}
              >
                <span>{space.emoji}</span>
                <span>{space.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Space activity log */}
        {selectedSpace && (
          <div className="px-6 pb-4 max-h-52 overflow-y-auto">
            {spaceLoading ? (
              <p className="text-xs text-soil-400 py-3">Loading…</p>
            ) : spaceEvents.length === 0 ? (
              <p className="text-xs text-soil-400 py-3">No recent activity in this space.</p>
            ) : (
              <div className="space-y-0.5 mt-2">
                {spaceEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => handleSpaceEventClick(ev)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-soil-50 flex items-start gap-2 transition-colors"
                  >
                    <span className="text-sm mt-0.5 shrink-0">{EVENT_ICONS[ev.type] ?? '·'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-soil-700 truncate">{ev.actor}</span>
                        <span className="text-xs text-soil-300 shrink-0">{relTime(ev.timestamp)}</span>
                      </div>
                      <p className="text-xs text-soil-500 line-clamp-1 mt-0.5">{ev.message}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages section — two-pane */}
      <div className="flex flex-1 min-h-0">
        {/* Thread list */}
        <div className="w-80 border-r border-soil-200 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-soil-100 shrink-0">
            <h2 className="text-xs font-semibold text-soil-500 uppercase tracking-wide">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <p className="text-xs text-soil-300">No message threads yet.</p>
                <p className="text-xs text-soil-200 mt-1">Comments on notes, specs, and images will appear here.</p>
              </div>
            ) : (
              threads.map(t => (
                <button
                  key={`${t.artifact_id}-${t.artifact_type}`}
                  onClick={() => setSelectedThread(t)}
                  className={`w-full text-left px-4 py-3 border-b border-soil-50 hover:bg-soil-50 transition-colors ${
                    selectedThread?.artifact_id === t.artifact_id ? 'bg-soil-100' : ''
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-soil-800 truncate">{t.artifact_title}</span>
                    <span className="text-xs text-soil-300 shrink-0">{relTime(t.last_comment_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-soil-500 font-medium shrink-0">{t.latest_author}:</span>
                    <p className="text-xs text-soil-400 line-clamp-1">{t.latest_body}</p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-soil-300 capitalize">{t.artifact_type}</span>
                    <span className="text-xs text-soil-300">{t.comment_count} comment{t.comment_count !== 1 ? 's' : ''}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedThread ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <span className="text-3xl mb-3">💬</span>
              <p className="text-sm text-soil-400">Select a thread to read the conversation.</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-soil-200 shrink-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-soil-800">{selectedThread.artifact_title}</h3>
                  <span className="text-xs text-soil-400 capitalize">{selectedThread.artifact_type}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {threadLoading ? (
                  <p className="text-xs text-soil-400">Loading…</p>
                ) : threadComments.length === 0 ? (
                  <p className="text-xs text-soil-400">No comments yet.</p>
                ) : (
                  threadComments.map(c => (
                    <div key={c.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${/^\w+$/.test(c.author) && !['Calvin', 'system'].includes(c.author) ? 'text-sky-600' : 'text-soil-700'}`}>
                          {c.author.startsWith('@') ? c.author : `@${c.author}` === c.author ? c.author : c.author}
                        </span>
                        <span className="text-xs text-soil-300">{relTime(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-soil-700 leading-relaxed">{renderBody(c.body)}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
