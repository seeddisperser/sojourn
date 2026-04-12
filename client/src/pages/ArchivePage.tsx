import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import NoteCard from '../components/archive/NoteCard'
import ImageCard from '../components/archive/ImageCard'
import CommentPanel from '../components/archive/CommentPanel'
import { useWebSocket } from '../hooks/useWebSocket'

interface Position { x: number; y: number }

interface Note { id: string; title: string; content: string; created_by: string; updated_by: string; updated_at: string }
interface Image { id: string; file_path: string; thumbnail_path: string | null; caption: string | null; created_by: string }
interface Cluster { id: string; title: string; created_by: string }
interface CardPos { id: string; type: 'note' | 'image'; x: number; y: number }

export default function ArchivePage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [commentTarget, setCommentTarget] = useState<{ id: string; type: string } | null>(null)
  const [clusterName, setClusterName] = useState('')
  const [showClusterInput, setShowClusterInput] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    api.artifacts.list().then((data: any) => {
      setNotes(data.notes ?? [])
      setImages(data.images ?? [])
    }).catch(() => {})
  }, [])

  useWebSocket(useCallback((msg) => {
    if (msg.type === 'artifact_created') {
      const p = msg.payload as any
      if (p.type === 'note') setNotes(prev => [p.artifact, ...prev.filter((n: any) => n.id !== p.artifact.id)])
      if (p.type === 'image') setImages(prev => [p.artifact, ...prev.filter((i: any) => i.id !== p.artifact.id)])
    }
    if (msg.type === 'artifact_updated') {
      const p = msg.payload as any
      if (p.type === 'note') setNotes(prev => prev.map((n: any) => n.id === p.artifact.id ? p.artifact : n))
      if (p.type === 'image') setImages(prev => prev.map((i: any) => i.id === p.artifact.id ? p.artifact : i))
    }
    if (msg.type === 'artifact_pruned') {
      const p = msg.payload as any
      if (p.artifact_type === 'note') setNotes(prev => prev.filter((n: any) => n.id !== p.id))
    }
    if (msg.type === 'card_moved') {
      const p = msg.payload as any
      setPositions(prev => ({ ...prev, [p.id]: { x: p.canvas_x, y: p.canvas_y } }))
    }
  }, []))

  function getPos(id: string, idx: number): Position {
    return positions[id] ?? { x: 20 + (idx % 5) * 220, y: 20 + Math.floor(idx / 5) * 200 }
  }

  function handleDragStart(e: React.MouseEvent, id: string) {
    const pos = positions[id] ?? { x: 0, y: 0 }
    setDragging(id)
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y })
    e.preventDefault()
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const newPos = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
    setPositions(prev => ({ ...prev, [dragging]: newPos }))
  }

  function handleMouseUp() {
    if (!dragging) return
    const pos = positions[dragging]
    if (pos) {
      const type = notes.find(n => n.id === dragging) ? 'note' : 'image'
      api.artifacts.updatePosition(dragging, type, pos.x, pos.y).catch(() => {})
    }
    setDragging(null)
  }

  function handleSelect(id: string, e: React.MouseEvent) {
    if (e.shiftKey) {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      })
    } else {
      setSelected(new Set([id]))
    }
  }

  async function handleCreateCluster() {
    if (!clusterName.trim() || selected.size === 0) return
    const memberIds = Array.from(selected).map(id => ({
      id,
      type: (notes.find(n => n.id === id) ? 'note' : 'image') as 'note' | 'image',
    }))
    await api.clusters.create(clusterName.trim(), memberIds)
    setClusterName('')
    setShowClusterInput(false)
    setSelected(new Set())
  }

  async function handleSendToNotary() {
    if (selected.size === 0) return
    // Find clusters that contain selected items, or create ad-hoc cluster
    const memberIds = Array.from(selected).map(id => ({
      id,
      type: (notes.find(n => n.id === id) ? 'note' : 'image') as 'note' | 'image',
    }))
    const cluster: any = await api.clusters.create('New Spec', memberIds)
    const spec: any = await api.specs.create('New Spec', [cluster.id])
    navigate(`/notary/${spec.id}`)
  }

  async function handleNewNote() {
    const note: any = await api.notes.create('New note', '')
    setNotes(prev => [note, ...prev])
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await api.images.upload(file).catch(err => alert(err.message))
    e.target.value = ''
  }

  async function handlePrune(id: string) {
    await api.artifacts.prune(id, 'note')
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  // Mobile list view
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <ArchiveToolbar
          hasSelection={selected.size > 0}
          onNewNote={handleNewNote}
          onGroup={() => setShowClusterInput(true)}
          onSendToNotary={handleSendToNotary}
          onUpload={handleUpload}
        />
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notes.map(n => (
            <div key={n.id} className="card p-3">
              <div className="font-medium text-sm text-soil-800">{n.title}</div>
              <div className="text-xs text-soil-400 mt-1 line-clamp-2">{n.content}</div>
            </div>
          ))}
          {images.map(img => (
            <div key={img.id} className="card overflow-hidden">
              <img src={api.images.thumbnailUrl(img.id)} className="w-full h-32 object-cover" alt="" />
              {img.caption && <div className="p-2 text-xs text-soil-500">{img.caption}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ArchiveToolbar
        hasSelection={selected.size > 0}
        onNewNote={handleNewNote}
        onGroup={() => setShowClusterInput(true)}
        onSendToNotary={handleSendToNotary}
        onUpload={handleUpload}
      />

      {showClusterInput && (
        <div className="flex items-center gap-2 px-4 py-2 bg-soil-50 border-b border-soil-200">
          <input
            autoFocus
            className="input text-sm"
            placeholder="Cluster name…"
            value={clusterName}
            onChange={e => setClusterName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateCluster(); if (e.key === 'Escape') setShowClusterInput(false) }}
          />
          <button className="btn-primary text-sm" onClick={handleCreateCluster}>Create</button>
          <button className="btn-secondary text-sm" onClick={() => setShowClusterInput(false)}>Cancel</button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-auto bg-soil-50"
        style={{ minHeight: 600 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {notes.map((note, idx) => (
          <NoteCard
            key={note.id}
            note={note}
            selected={selected.has(note.id)}
            onSelect={handleSelect}
            onPrune={handlePrune}
            style={{ left: getPos(note.id, idx).x, top: getPos(note.id, idx).y, zIndex: dragging === note.id ? 100 : 1 }}
            onDragStart={handleDragStart}
          />
        ))}
        {images.map((img, idx) => (
          <ImageCard
            key={img.id}
            image={img}
            selected={selected.has(img.id)}
            onSelect={handleSelect}
            style={{ left: getPos(img.id, notes.length + idx).x, top: getPos(img.id, notes.length + idx).y, zIndex: dragging === img.id ? 100 : 1 }}
            onDragStart={handleDragStart}
          />
        ))}
      </div>

      {commentTarget && (
        <CommentPanel
          artifactId={commentTarget.id}
          artifactType={commentTarget.type}
          onClose={() => setCommentTarget(null)}
        />
      )}
    </div>
  )
}

function ArchiveToolbar({ hasSelection, onNewNote, onGroup, onSendToNotary, onUpload }: {
  hasSelection: boolean; onNewNote: () => void; onGroup: () => void; onSendToNotary: () => void; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-soil-200 bg-white shrink-0">
      <h2 className="text-sm font-semibold text-soil-600 mr-2">Archive</h2>
      <button className="btn-secondary text-xs" onClick={onNewNote}>+ Note</button>
      <label className="btn-secondary text-xs cursor-pointer">
        + Image
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </label>
      {hasSelection && (
        <>
          <button className="btn-secondary text-xs" onClick={onGroup}>Group</button>
          <button className="btn-primary text-xs" onClick={onSendToNotary}>→ Notary</button>
        </>
      )}
    </div>
  )
}
