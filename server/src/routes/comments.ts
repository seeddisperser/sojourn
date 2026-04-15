import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'
import { getConfig } from '../config.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const commentsRouter = Router()

commentsRouter.post('/comments', (req: AuthRequest, res) => {
  const { artifact_id, artifact_type, body, parent_id } = req.body as {
    artifact_id: string; artifact_type: string; body: string; parent_id?: string
  }
  if (!artifact_id || !artifact_type || !body?.trim()) {
    res.status(400).json({ error: 'artifact_id, artifact_type, and body are required' })
    return
  }
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  const author = req.session?.user_name ?? 'unknown'

  db.prepare(`
    INSERT INTO comments (id, parent_id, artifact_id, artifact_type, author, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, parent_id ?? null, artifact_id, artifact_type, author, body.trim(), now)

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id)
  broadcast({ type: 'comment_posted', payload: comment })
  createEvent('comment_posted', `${author} commented`, author, {
    related_artifact_id: artifact_id,
    related_artifact_type: artifact_type,
    metadata: { comment_id: id },
  })

  // Dispatch @mention webhooks fire-and-forget
  dispatchMentions(body.trim(), id, author, artifact_id, artifact_type)

  res.status(201).json(comment)
})

commentsRouter.get('/comments', (req: AuthRequest, res) => {
  const { artifact_id, artifact_type } = req.query as { artifact_id?: string; artifact_type?: string }
  if (!artifact_id || !artifact_type) {
    res.status(400).json({ error: 'artifact_id and artifact_type query params required' })
    return
  }
  const comments = getDb().prepare(`
    SELECT * FROM comments WHERE artifact_id = ? AND artifact_type = ? ORDER BY created_at ASC
  `).all(artifact_id, artifact_type)
  res.json(comments)
})

function dispatchMentions(
  body: string, commentId: string, author: string,
  artifactId: string, artifactType: string
): void {
  const handles = [...body.matchAll(/@(\w+)/g)].map(m => m[1])
  if (handles.length === 0) return

  let agents: Record<string, string>
  try {
    agents = getConfig().agents ?? {}
  } catch {
    return
  }

  const db = getDb()

  // Fetch artifact details for webhook payload
  let artifactTitle = artifactId
  let artifactContent = ''
  try {
    if (artifactType === 'note') {
      const row = db.prepare('SELECT title, content FROM notes WHERE id = ?').get(artifactId) as { title: string; content: string } | undefined
      if (row) { artifactTitle = row.title; artifactContent = row.content }
    } else if (artifactType === 'spec') {
      const row = db.prepare('SELECT title, body_json FROM specs WHERE id = ?').get(artifactId) as { title: string; body_json: string } | undefined
      if (row) { artifactTitle = row.title; artifactContent = row.body_json ?? '' }
    }
  } catch { /* non-fatal */ }

  for (const handle of handles) {
    const url = agents[handle]
    if (!url) continue
    const payload = {
      mention: handle,
      comment: { id: commentId, body, author },
      artifact: { type: artifactType, id: artifactId, title: artifactTitle, content: artifactContent },
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.warn(`[mentions] webhook dispatch to ${handle} failed: ${(err as Error).message}`)
    })
  }
}

// List comment threads: one entry per unique (artifact_id, artifact_type), ordered by most recent comment
commentsRouter.get('/comments/threads', (req: AuthRequest, res) => {
  const db = getDb()
  const threads = db.prepare(`
    SELECT
      c.artifact_id,
      c.artifact_type,
      COUNT(*) as comment_count,
      MAX(c.created_at) as last_comment_at,
      (SELECT body FROM comments WHERE artifact_id = c.artifact_id AND artifact_type = c.artifact_type ORDER BY created_at DESC LIMIT 1) as latest_body,
      (SELECT author FROM comments WHERE artifact_id = c.artifact_id AND artifact_type = c.artifact_type ORDER BY created_at DESC LIMIT 1) as latest_author
    FROM comments c
    GROUP BY c.artifact_id, c.artifact_type
    ORDER BY last_comment_at DESC
    LIMIT 100
  `).all()

  // Enrich with artifact titles
  const enriched = (threads as Array<{
    artifact_id: string; artifact_type: string; comment_count: number;
    last_comment_at: string; latest_body: string; latest_author: string
  }>).map(t => {
    let title = t.artifact_id
    try {
      if (t.artifact_type === 'note') {
        const row = db.prepare('SELECT title FROM notes WHERE id = ?').get(t.artifact_id) as { title: string } | undefined
        if (row) title = row.title
      } else if (t.artifact_type === 'image') {
        const row = db.prepare('SELECT caption FROM images WHERE id = ?').get(t.artifact_id) as { caption: string | null } | undefined
        if (row) title = row.caption ?? 'Image'
      } else if (t.artifact_type === 'spec') {
        const row = db.prepare('SELECT title FROM specs WHERE id = ?').get(t.artifact_id) as { title: string } | undefined
        if (row) title = row.title
      }
    } catch { /* ignore */ }
    return { ...t, artifact_title: title }
  })

  res.json(enriched)
})
