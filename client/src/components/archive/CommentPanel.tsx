import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useStore } from '../../store'

interface Comment {
  id: string
  parent_id: string | null
  author: string
  body: string
  created_at: string
}

interface CommentPanelProps {
  artifactId: string
  artifactType: string
  onClose: () => void
}

export default function CommentPanel({ artifactId, artifactType, onClose }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const userName = useStore(s => s.userName)

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
  const replies = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-soil-200 shadow-xl flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-soil-200">
        <span className="font-medium text-sm text-soil-700">Comments</span>
        <button onClick={onClose} className="text-soil-400 hover:text-soil-600 text-lg">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {roots.length === 0 && <p className="text-sm text-soil-400 text-center py-8">No comments yet.</p>}
        {roots.map(c => (
          <div key={c.id} className="space-y-2">
            <CommentItem comment={c} onReply={() => setReplyTo(c.id)} />
            {replies(c.id).map(r => (
              <div key={r.id} className="ml-4">
                <CommentItem comment={r} onReply={() => setReplyTo(c.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-soil-200">
        {replyTo && (
          <div className="flex items-center gap-1 mb-2 text-xs text-soil-400">
            <span>Replying to thread</span>
            <button type="button" onClick={() => setReplyTo(null)} className="hover:text-soil-600">× cancel</button>
          </div>
        )}
        <textarea
          className="input w-full resize-none text-sm"
          rows={3}
          placeholder="Add a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary mt-2 w-full" disabled={!body.trim()}>
          Post
        </button>
      </form>
    </div>
  )
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
  return (
    <div className="bg-soil-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-soil-700">{comment.author}</span>
        <span className="text-xs text-soil-300">{new Date(comment.created_at).toLocaleDateString()}</span>
      </div>
      <p className="text-sm text-soil-700 leading-relaxed">{comment.body}</p>
      <button onClick={onReply} className="text-xs text-soil-400 hover:text-soil-600 mt-1">Reply</button>
    </div>
  )
}
