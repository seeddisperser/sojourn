import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import NoteCard from '../components/archive/NoteCard'
import ImageCard from '../components/archive/ImageCard'
import ItemOverlay, { type OverlayItem } from '../components/archive/ItemOverlay'
import { useWebSocket } from '../hooks/useWebSocket'

interface Position { x: number; y: number }

interface Note {
  id: string
  title: string
  content: string
  created_by: string
  updated_by: string
  updated_at: string
  canvas_x?: number | null
  canvas_y?: number | null
}

interface Image {
  id: string
  file_path: string
  thumbnail_path: string | null
  caption: string | null
  created_by: string
  canvas_x?: number | null
  canvas_y?: number | null
}

export default function ArchivePage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [overlayTarget, setOverlayTarget] = useState<OverlayItem | null>(null)
  const [clusterName, setClusterName] = useState('')
  const [showClusterInput, setShowClusterInput] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef(false)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, scrollX: 0, scrollY: 0 })

  const navigate = useNavigate()
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    api.artifacts.list().then((data: unknown) => {
      const d = data as { notes: Note[]; images: Image[] }
      const noteList = d.notes ?? []
      const imageList = d.images ?? []
      setNotes(noteList)
      setImages(imageList)

      // Load saved canvas positions
      const pos: Record<string, Position> = {}
      for (const n of noteList) {
        if (n.canvas_x != null && n.canvas_y != null) {
          pos[n.id] = { x: n.canvas_x, y: n.canvas_y }
        }
      }
      for (const img of imageList) {
        if (img.canvas_x != null && img.canvas_y != null) {
          pos[img.id] = { x: img.canvas_x, y: img.canvas_y }
        }
      }
      setPositions(pos)
    }).catch(() => {})
  }, [])

  useWebSocket(useCallback((msg: { type: string; payload: unknown }) => {
    const p = msg.payload as Record<string, unknown>
    if (msg.type === 'artifact_created') {
      if (p.type === 'note') setNotes(prev => [p.artifact as Note, ...prev.filter(n => n.id !== (p.artifact as Note).id)])
      if (p.type === 'image') setImages(prev => [p.artifact as Image, ...prev.filter(i => i.id !== (p.artifact as Image).id)])
    }
    if (msg.type === 'artifact_updated') {
      if (p.type === 'note') setNotes(prev => prev.map(n => n.id === (p.artifact as Note).id ? p.artifact as Note : n))
      if (p.type === 'image') setImages(prev => prev.map(i => i.id === (p.artifact as Image).id ? p.artifact as Image : i))
    }
    if (msg.type === 'artifact_pruned') {
      if (p.artifact_type === 'note') setNotes(prev => prev.filter(n => n.id !== (p.id as string)))
    }
    if (msg.type === 'card_moved') {
      setPositions(prev => ({ ...prev, [p.id as string]: { x: p.canvas_x as number, y: p.canvas_y as number } }))
    }
  }, []))

  function getPos(id: string, idx: number): Position {
    return positions[id] ?? { x: 20 + (idx % 5) * 220, y: 20 + Math.floor(idx / 5) * 200 }
  }

  function handleDragStart(e: React.MouseEvent, id: string) {
    hasDraggedRef.current = false
    const pos = positions[id] ?? { x: 0, y: 0 }
    setDragging(id)
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y })
    e.preventDefault()
  }

  function handleCanvasPanStart(e: React.MouseEvent) {
    if (dragging) return
    isPanningRef.current = true
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      scrollX: canvasRef.current?.scrollLeft ?? 0,
      scrollY: canvasRef.current?.scrollTop ?? 0,
    }
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    e.preventDefault()
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragging) {
      hasDraggedRef.current = true
      const newPos = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
      setPositions(prev => ({ ...prev, [dragging]: newPos }))
      return
    }
    if (isPanningRef.current && canvasRef.current) {
      canvasRef.current.scrollLeft = panStartRef.current.scrollX + panStartRef.current.mouseX - e.clientX
      canvasRef.current.scrollTop = panStartRef.current.scrollY + panStartRef.current.mouseY - e.clientY
    }
  }

  function stopInteraction() {
    if (dragging) {
      const pos = positions[dragging]
      if (pos) {
        const type = notes.find(n => n.id === dragging) ? 'note' : 'image'
        api.artifacts.updatePosition(dragging, type, pos.x, pos.y).catch(() => {})
      }
      setDragging(null)
    }
    if (isPanningRef.current) {
      isPanningRef.current = false
      if (canvasRef.current) canvasRef.current.style.cursor = ''
    }
  }

  function handleCardOpen(id: string) {
    if (hasDraggedRef.current) return
    const note = notes.find(n => n.id === id)
    if (note) { setOverlayTarget({ type: 'note', data: note }); return }
    const image = images.find(i => i.id === id)
    if (image) setOverlayTarget({ type: 'image', data: image })
  }

  function handleSelect(id: string, e: React.MouseEvent) {
    setSelected(prev => {
      const next = new Set(prev)
      if (e.shiftKey) {
        if (next.has(id)) next.delete(id); else next.add(id)
      } else {
        return new Set([id])
      }
      return next
    })
  }

  async function handleCreateCluster() {
    if (!clusterName.trim()) return
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
    const memberIds = Array.from(selected).map(id => ({
      id,
      type: (notes.find(n => n.id === id) ? 'note' : 'image') as 'note' | 'image',
    }))
    const cluster = await api.clusters.create('New Spec', memberIds) as { id: string }
    const spec = await api.specs.create('New Spec', [cluster.id]) as { id: string }
    navigate(`/notary/${spec.id}`)
  }

  async function handleNewNote() {
    const note = await api.notes.create('New note', '') as Note
    setNotes(prev => [note, ...prev])
    // Open immediately for editing
    setOverlayTarget({ type: 'note', data: note })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await api.images.upload(file).catch(err => alert((err as Error).message))
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
            <div key={n.id} className="card p-3" onClick={() => setOverlayTarget({ type: 'note', data: n })}>
              <div className="font-medium text-sm text-soil-800">{n.title}</div>
              <div className="text-xs text-soil-400 mt-1 line-clamp-2">{n.content}</div>
            </div>
          ))}
          {images.map(img => (
            <div key={img.id} className="card overflow-hidden" onClick={() => setOverlayTarget({ type: 'image', data: img })}>
              <img src={api.images.thumbnailUrl(img.id)} className="w-full h-32 object-cover" alt="" />
              {img.caption && <div className="p-2 text-xs text-soil-500">{img.caption}</div>}
            </div>
          ))}
        </div>
        {overlayTarget && (
          <ItemOverlay
            item={overlayTarget}
            onClose={() => setOverlayTarget(null)}
            onNoteUpdated={updated => setNotes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n))}
            onImageUpdated={updated => setImages(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))}
          />
        )}
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
        className="flex-1 overflow-auto bg-soil-50 select-none"
        style={{ minHeight: 600, cursor: 'grab' }}
        onMouseDown={handleCanvasPanStart}
        onMouseMove={handleMouseMove}
        onMouseUp={stopInteraction}
        onMouseLeave={stopInteraction}
      >
        {/* Inner canvas — large enough to scroll around */}
        <div className="relative" style={{ minWidth: 3000, minHeight: 2000 }}>
          {notes.map((note, idx) => (
            <NoteCard
              key={note.id}
              note={note}
              selected={selected.has(note.id)}
              onSelect={handleSelect}
              onOpen={handleCardOpen}
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
              onOpen={handleCardOpen}
              style={{ left: getPos(img.id, notes.length + idx).x, top: getPos(img.id, notes.length + idx).y, zIndex: dragging === img.id ? 100 : 1 }}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      </div>

      {overlayTarget && (
        <ItemOverlay
          item={overlayTarget}
          onClose={() => setOverlayTarget(null)}
          onNoteUpdated={updated => setNotes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n))}
          onImageUpdated={updated => setImages(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))}
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
      <button className="btn-secondary text-xs" onClick={onGroup}>+ Group</button>
      {hasSelection && (
        <button className="btn-primary text-xs" onClick={onSendToNotary}>→ Notary</button>
      )}
    </div>
  )
}
