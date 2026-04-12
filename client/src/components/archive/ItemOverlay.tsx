import { useState, useEffect } from 'react'
import { api } from '../../api'

interface Note {
  id: string
  title: string
  content: string
  created_by: string
  updated_by: string
  updated_at: string
}

interface Image {
  id: string
  file_path: string
  thumbnail_path: string | null
  caption: string | null
  created_by: string
}

interface Comment {
  id: string
  parent_id: string | null
  author: string
  body: string
  created_at: string
}

export type OverlayItem =
  | { type: 'note'; data: Note }
  | { type: 'image'; data: Image }

interface ItemOverlayProps {
  item: OverlayItem
  onClose: () => void
  onNoteUpdated?: (note: Note) => void
  onImageUpdated?: (image: Image) => void
}

export default function ItemOverlay({ item, onClose, onNoteUpdated, onImageUpdated }: ItemOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30, 20, 10, 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex overflow-hidden"
        style={{ width: '90vw', height: '85vh', maxWidth: 1100 }}
      >
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-3 border-b border-soil-200 shrink-0">
            <span className="text-xs font-medium text-soil-400 uppercase tracking-wider">
              {item.type === 'note' ? 'Note' : 'Image'} · {item.data.created_by}
            </span>
            <button
              onClick={onClose}
              className="text-soil-400 hover:text-soil-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {item.type === 'note'
              ? <NoteEditor note={item.data} onSaved={updated => onNoteUpdated?.(updated)} />
              : <ImageViewer image={item.data} onSaved={updated => onImageUpdated?.(updated)} />
            }
          </div>
        </div>

        {/* Comments column */}
        <div className="w-72 border-l border-soil-200 flex flex-col shrink-0">
          <CommentsSection artifactId={item.data.id} artifactType={item.type} />
        </div>
      </div>
    </div>
  )
}

function NoteEditor({ note, onSaved }: { note: Note; onSaved: (updated: Note) => void }) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function handleSave() {
    if (!dirty) return
    setSaving(true)
    try {
      const updated = await api.notes.update(note.id, { title, content }) as Note
      onSaved(updated)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <input
        className="text-xl font-semibold text-soil-800 border-0 outline-none w-full bg-transparent placeholder-soil-300"
        value={title}
        onChange={e => { setTitle(e.target.value); setDirty(true) }}
        placeholder="Title"
      />
      <div className="border-b border-soil-100" />
      <textarea
        className="flex-1 text-sm text-soil-700 border-0 outline-none w-full bg-transparent resize-none leading-relaxed placeholder-soil-300"
        value={content}
        onChange={e => { setContent(e.target.value); setDirty(true) }}
        placeholder="Write something…"
      />
      <div className="flex items-center gap-3 pt-2 border-t border-soil-100 shrink-0">
        <button
          className="btn-primary text-xs"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {!dirty && <span className="text-xs text-soil-300">Saved</span>}
      </div>
    </div>
  )
}

function ImageViewer({ image, onSaved }: { image: Image; onSaved: (updated: Image) => void }) {
  const [caption, setCaption] = useState(image.caption ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function handleSave() {
    if (!dirty) return
    setSaving(true)
    try {
      const updated = await api.images.update(image.id, { caption }) as Image
      onSaved(updated)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 flex items-center justify-center bg-soil-50 rounded-xl overflow-hidden min-h-0">
        <img
          src={api.images.fullUrl(image.id)}
          alt={image.caption ?? 'Image'}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className="flex items-end gap-2 shrink-0">
        <textarea
          className="flex-1 input text-sm resize-none"
          rows={2}
          placeholder="Add a caption…"
          value={caption}
          onChange={e => { setCaption(e.target.value); setDirty(true) }}
        />
        <button
          className="btn-primary text-xs shrink-0"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function CommentsSection({ artifactId, artifactType }: { artifactId: string; artifactType: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  useEffect(() => {
    api.comments.list(artifactId, artifactType)
      .then(data => setComments(data as Comment[]))
      .catch(() => {})
  }, [artifactId, artifactType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    const comment = await api.comments.create(artifactId, artifactType, body.trim(), replyTo ?? undefined)
    setComments(prev => [...prev, comment as Comment])
    setBody('')
    setReplyTo(null)
  }

  const roots = comments.filter(c => !c.parent_id)

  return (
    <>
      <div className="px-4 py-3 border-b border-soil-200 shrink-0">
        <span className="text-xs font-semibold text-soil-600 uppercase tracking-wider">Comments</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {roots.length === 0 && (
          <p className="text-xs text-soil-400 text-center pt-8">No comments yet.</p>
        )}
        {roots.map(c => {
          const replies = comments.filter(r => r.parent_id === c.id)
          return (
            <div key={c.id}>
              <CommentBubble comment={c} onReply={() => setReplyTo(c.id)} />
              {replies.map(r => (
                <div key={r.id} className="ml-3">
                  <CommentBubble comment={r} onReply={() => setReplyTo(c.id)} />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-soil-200 shrink-0">
        {replyTo && (
          <div className="flex items-center gap-1 mb-1 text-xs text-soil-400">
            <span>Replying</span>
            <button type="button" onClick={() => setReplyTo(null)} className="hover:text-soil-600">
              × cancel
            </button>
          </div>
        )}
        <textarea
          className="input w-full text-xs resize-none"
          rows={3}
          placeholder="Add a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary mt-1 w-full text-xs"
          disabled={!body.trim()}
        >
          Post
        </button>
      </form>
    </>
  )
}

function CommentBubble({ comment, onReply }: { comment: Comment; onReply: () => void }) {
  return (
    <div className="bg-soil-50 rounded-lg p-2 mb-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs font-semibold text-soil-700">{comment.author}</span>
        <span className="text-xs text-soil-300">{new Date(comment.created_at).toLocaleDateString()}</span>
      </div>
      <p className="text-xs text-soil-700 leading-relaxed">{comment.body}</p>
      <button onClick={onReply} className="text-xs text-soil-400 hover:text-soil-600 mt-0.5">Reply</button>
    </div>
  )
}
