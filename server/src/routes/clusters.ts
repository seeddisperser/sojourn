import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { broadcast } from '../ws.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const clustersRouter = Router()

clustersRouter.post('/clusters', (req: AuthRequest, res) => {
  const { title, description, member_ids, canvas_x, canvas_y } = req.body as {
    title: string
    description?: string
    member_ids: Array<{ id: string; type: 'note' | 'image' }>
    canvas_x?: number
    canvas_y?: number
  }

  if (!title || !Array.isArray(member_ids)) {
    res.status(400).json({ error: 'title and member_ids are required' })
    return
  }

  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  const actor = req.session?.user_name ?? 'system'

  db.prepare(`
    INSERT INTO clusters (id, title, description, canvas_x, canvas_y, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description ?? null, canvas_x ?? null, canvas_y ?? null, now, now, actor)

  for (const m of member_ids) {
    db.prepare('INSERT OR IGNORE INTO cluster_members VALUES (?, ?, ?)').run(id, m.id, m.type)
  }

  const cluster = db.prepare('SELECT * FROM clusters WHERE id = ?').get(id)
  broadcast({ type: 'artifact_created', payload: { type: 'cluster', artifact: cluster } })
  res.status(201).json(cluster)
})

clustersRouter.get('/clusters/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const cluster = db.prepare('SELECT * FROM clusters WHERE id = ?').get(req.params.id)
  if (!cluster) { res.status(404).json({ error: 'Not found' }); return }
  const members = db.prepare('SELECT * FROM cluster_members WHERE cluster_id = ?').all(req.params.id)
  res.json({ ...cluster as object, members })
})

clustersRouter.patch('/clusters/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { title, description, canvas_x, canvas_y, canvas_w, canvas_h } = req.body as {
    title?: string; description?: string; canvas_x?: number; canvas_y?: number; canvas_w?: number; canvas_h?: number
  }
  const now = new Date().toISOString()
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM clusters WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const updates: string[] = []
  const vals: unknown[] = []
  if (title !== undefined) { updates.push('title = ?'); vals.push(title) }
  if (description !== undefined) { updates.push('description = ?'); vals.push(description) }
  if (canvas_x !== undefined) { updates.push('canvas_x = ?'); vals.push(canvas_x) }
  if (canvas_y !== undefined) { updates.push('canvas_y = ?'); vals.push(canvas_y) }
  if (canvas_w !== undefined) { updates.push('canvas_w = ?'); vals.push(canvas_w) }
  if (canvas_h !== undefined) { updates.push('canvas_h = ?'); vals.push(canvas_h) }
  updates.push('updated_at = ?')
  vals.push(now, id)

  db.prepare(`UPDATE clusters SET ${updates.join(', ')} WHERE id = ?`).run(...vals)

  const updated = db.prepare('SELECT * FROM clusters WHERE id = ?').get(id)
  broadcast({ type: 'artifact_updated', payload: { type: 'cluster', artifact: updated } })
  res.json(updated)
})
