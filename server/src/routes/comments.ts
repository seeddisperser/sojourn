import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'
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
