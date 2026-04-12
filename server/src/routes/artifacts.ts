import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { broadcast } from '../ws.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const artifactsRouter = Router()

// List all artifacts (notes + images + clusters) with pagination
artifactsRouter.get('/artifacts', (req: AuthRequest, res) => {
  const db = getDb()
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  const notes = db.prepare(`
    SELECT id, title, 'note' as type, created_at, updated_at, created_by, pruned
    FROM notes WHERE pruned = 0 LIMIT ? OFFSET ?
  `).all(limit, offset)

  const images = db.prepare(`
    SELECT id, 'image' as type, created_at, created_by
    FROM images LIMIT ? OFFSET ?
  `).all(limit, offset)

  const clusters = db.prepare(`
    SELECT id, title, 'cluster' as type, created_at, updated_at, created_by
    FROM clusters LIMIT ? OFFSET ?
  `).all(limit, offset)

  res.json({ notes, images, clusters })
})

// Update card position on Archive canvas
artifactsRouter.patch('/card-positions/:id', (req: AuthRequest, res) => {
  const { id } = req.params
  const { artifact_type, canvas_x, canvas_y } = req.body as {
    artifact_type: 'note' | 'image' | 'cluster'; canvas_x: number; canvas_y: number
  }

  if (!artifact_type || canvas_x === undefined || canvas_y === undefined) {
    res.status(400).json({ error: 'artifact_type, canvas_x, canvas_y required' })
    return
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO card_positions (artifact_id, artifact_type, canvas_x, canvas_y)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(artifact_id, artifact_type) DO UPDATE SET canvas_x = excluded.canvas_x, canvas_y = excluded.canvas_y
  `).run(id, artifact_type, canvas_x, canvas_y)

  broadcast({ type: 'card_moved', payload: { id, artifact_type, canvas_x, canvas_y } })
  res.json({ ok: true })
})

// Soft-prune artifact from Archive
artifactsRouter.patch('/artifacts/:id/prune', (req: AuthRequest, res) => {
  const { id } = req.params
  const { artifact_type } = req.body as { artifact_type: string }

  const db = getDb()
  if (artifact_type === 'note') {
    db.prepare('UPDATE notes SET pruned = 1 WHERE id = ?').run(id)
  }
  // Images and clusters: just broadcast the prune event (no pruned column needed for MVP)

  broadcast({ type: 'artifact_pruned', payload: { id, artifact_type } })
  res.json({ ok: true })
})
