import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useWebSocket } from '../hooks/useWebSocket'

interface Spec {
  id: string
  title: string
  status: 'draft' | 'finalized'
  body_json: string
  created_by: string
  updated_by: string
  version: number
  updated_at: string
  source_cluster_ids: string[]
  linked_build_ids: string[]
}

interface SpecListItem {
  id: string
  title: string
  status: string
  updated_at: string
}

const SECTION_TEMPLATE = [
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Hypothesis / Conviction' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Why This Matters' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Scope' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Constraints' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Open Questions' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Implementation Notes' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Next Actions' }] },
  { type: 'paragraph', content: [] },
]

export default function NotaryPage() {
  const { specId } = useParams()
  const navigate = useNavigate()
  const [specs, setSpecs] = useState<SpecListItem[]>([])
  const [activeSpec, setActiveSpec] = useState<Spec | null>(null)
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [saving, setSaving] = useState(false)
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [buildCommand, setBuildCommand] = useState('')

  useEffect(() => {
    api.specs.list().then(data => setSpecs(data as SpecListItem[])).catch(() => {})
  }, [])

  useEffect(() => {
    if (specId) {
      api.specs.get(specId).then(data => {
        const spec = data as Spec
        setActiveSpec(spec)
        setTitle(spec.title)
        // Use body as plain text editable area for MVP (BlockNote integration is additive)
        setBodyText(spec.body_json === '[]' ? '' : spec.body_json)
      }).catch(() => {})
    }
  }, [specId])

  useWebSocket(useCallback((msg) => {
    if (msg.type === 'artifact_updated') {
      const p = msg.payload as any
      if (p.type === 'spec' && p.artifact.id === specId) {
        setActiveSpec(p.artifact)
        setTitle(p.artifact.title)
      }
    }
    if (msg.type === 'artifact_created' && (msg.payload as any).type === 'spec') {
      const p = msg.payload as any
      setSpecs(prev => [p.artifact, ...prev.filter((s: any) => s.id !== p.artifact.id)])
    }
  }, [specId]))

  async function handleSave() {
    if (!activeSpec) return
    setSaving(true)
    await api.specs.update(activeSpec.id, { title, body_json: bodyText }).catch(() => {})
    setSaving(false)
  }

  async function handleFinalize() {
    if (!activeSpec) return
    await api.specs.update(activeSpec.id, { status: 'finalized' })
    setActiveSpec(prev => prev ? { ...prev, status: 'finalized' } : prev)
  }

  async function handleReopen() {
    if (!activeSpec) return
    await api.specs.update(activeSpec.id, { status: 'draft' })
    setActiveSpec(prev => prev ? { ...prev, status: 'draft' } : prev)
  }

  async function handleTriggerBuild() {
    if (!buildCommand.trim() || !activeSpec) return
    const build: any = await api.builds.create(buildCommand.trim(), activeSpec.id)
    setShowBuildModal(false)
    setBuildCommand('')
    navigate(`/workshop/${build.id}`)
  }

  return (
    <div className="flex h-full">
      {/* Spec list sidebar */}
      <div className="w-56 border-r border-soil-200 bg-soil-50 flex flex-col shrink-0">
        <div className="p-3 border-b border-soil-200">
          <span className="text-sm font-semibold text-soil-600">Specs</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {specs.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/notary/${s.id}`)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-soil-100 ${
                s.id === specId ? 'bg-white text-soil-800 font-medium' : 'text-soil-500 hover:bg-white hover:text-soil-700'
              }`}
            >
              <div className="truncate">{s.title}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-xs px-1.5 rounded-full ${s.status === 'finalized' ? 'bg-moss-100 text-moss-700' : 'bg-soil-100 text-soil-500'}`}>
                  {s.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {activeSpec ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-soil-200 bg-white shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeSpec.status === 'finalized' ? 'bg-moss-100 text-moss-700' : 'bg-soil-100 text-soil-600'
            }`}>
              {activeSpec.status}
            </span>
            <span className="text-xs text-soil-300">v{activeSpec.version}</span>
            <div className="flex-1" />
            {activeSpec.status === 'draft' ? (
              <>
                <button className="btn-secondary text-xs" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn-primary text-xs" onClick={handleFinalize}>Finalize</button>
              </>
            ) : (
              <>
                <button className="btn-secondary text-xs" onClick={handleReopen}>Reopen</button>
                <button className="btn-primary text-xs" onClick={() => setShowBuildModal(true)}>Trigger Build →</button>
              </>
            )}
          </div>

          {/* Title */}
          <div className="px-6 pt-6 pb-2">
            <input
              className="w-full text-2xl font-semibold text-soil-800 bg-transparent border-none outline-none focus:outline-none"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleSave}
              placeholder="Spec title…"
              disabled={activeSpec.status === 'finalized'}
            />
            <div className="text-xs text-soil-300 mt-1">
              Last edited by {activeSpec.updated_by} · {new Date(activeSpec.updated_at).toLocaleString()}
            </div>
          </div>

          {/* Body editor */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {activeSpec.status === 'finalized' ? (
              <div className="prose prose-sm max-w-none text-soil-700 whitespace-pre-wrap mt-4">
                {bodyText || <span className="text-soil-300 italic">No content.</span>}
              </div>
            ) : (
              <textarea
                className="w-full h-full min-h-96 text-sm text-soil-700 bg-transparent resize-none outline-none leading-relaxed"
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                onBlur={handleSave}
                placeholder={`Start writing your spec…\n\n${SECTION_TEMPLATE.map(b => (b.content[0] as any)?.text || '').filter(Boolean).join('\n\n')}`}
              />
            )}
          </div>

          {/* Linked builds */}
          {activeSpec.linked_build_ids.length > 0 && (
            <div className="px-6 pb-4 border-t border-soil-100 pt-3">
              <span className="text-xs font-medium text-soil-500 uppercase tracking-wide">Linked builds</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeSpec.linked_build_ids.map(bid => (
                  <button key={bid} onClick={() => navigate(`/workshop/${bid}`)}
                    className="text-xs bg-moss-100 text-moss-700 rounded-full px-2 py-0.5 hover:bg-moss-200">
                    Build {bid.slice(0, 8)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-soil-300 text-sm">
          Select a spec or send a cluster from Archive
        </div>
      )}

      {/* Build trigger modal */}
      {showBuildModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg">
            <h3 className="font-semibold text-soil-800 mb-3">Trigger Build</h3>
            <p className="text-sm text-soil-500 mb-3">Enter the command to run on the Pi. Example: <code className="bg-soil-100 px-1 rounded text-xs">claude --dangerously-skip-permissions -p "Build this"</code></p>
            <input
              autoFocus
              className="input w-full text-sm font-mono"
              placeholder="claude -p &quot;...&quot;"
              value={buildCommand}
              onChange={e => setBuildCommand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleTriggerBuild() }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-secondary" onClick={() => setShowBuildModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleTriggerBuild}>Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
