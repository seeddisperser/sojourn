import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const webhooksRouter = Router()

// Receive a reply from an agent and post it as a comment attributed to the agent handle
webhooksRouter.post('/webhooks/agent/:handle/reply', (req: AuthRequest, res) => {
  const { handle } = req.params
  const { artifact_id, artifact_type, body } = req.body as {
    artifact_id?: string; artifact_type?: string; body?: string
  }

  if (!artifact_id || !artifact_type || !body?.trim()) {
    res.status(400).json({ error: 'artifact_id, artifact_type, and body are required' })
    return
  }

  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO comments (id, parent_id, artifact_id, artifact_type, author, body, created_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?)
  `).run(id, artifact_id, artifact_type, handle, body.trim(), now)

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id)
  broadcast({ type: 'comment_posted', payload: comment })
  createEvent('agent_message', `${handle} replied`, handle, {
    related_artifact_id: artifact_id,
    related_artifact_type: artifact_type,
    metadata: { comment_id: id, agent: handle },
  })

  res.status(201).json(comment)
})
