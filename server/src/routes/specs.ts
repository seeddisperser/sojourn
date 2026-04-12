import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const specsRouter = Router()

specsRouter.post('/specs', (req: AuthRequest, res) => {
  const { title = 'Untitled Spec', source_cluster_ids = [], body_json = '[]' } = req.body as {
    title?: string; source_cluster_ids?: string[]; body_json?: string
  }
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  const actor = req.session?.user_name ?? 'system'

  db.prepare(`
    INSERT INTO specs (id, title, status, body_json, created_by, updated_by, version, created_at, updated_at)
    VALUES (?, ?, 'draft', ?, ?, ?, 1, ?, ?)
  `).run(id, title, body_json, actor, actor, now, now)

  for (const cid of source_cluster_ids) {
    db.prepare('INSERT OR IGNORE INTO spec_source_clusters VALUES (?, ?)').run(id, cid)
  }

  const spec = db.prepare('SELECT * FROM specs WHERE id = ?').get(id)
  broadcast({ type: 'artifact_created', payload: { type: 'spec', artifact: spec } })
  createEvent('spec_created', `Spec created: ${title}`, actor, {
    related_artifact_id: id, related_artifact_type: 'spec',
  })
  res.status(201).json(spec)
})

specsRouter.get('/specs', (_req: AuthRequest, res) => {
  const specs = getDb().prepare('SELECT * FROM specs ORDER BY updated_at DESC').all()
  res.json(specs)
})

specsRouter.get('/specs/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const spec = db.prepare('SELECT * FROM specs WHERE id = ?').get(req.params.id)
  if (!spec) { res.status(404).json({ error: 'Not found' }); return }
  const source_clusters = db.prepare('SELECT cluster_id FROM spec_source_clusters WHERE spec_id = ?').all(req.params.id)
  const linked_builds = db.prepare('SELECT build_session_id FROM spec_linked_builds WHERE spec_id = ?').all(req.params.id)
  res.json({
    ...spec as object,
    source_cluster_ids: source_clusters.map((r: any) => r.cluster_id),
    linked_build_ids: linked_builds.map((r: any) => r.build_session_id),
  })
})

specsRouter.patch('/specs/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { title, body_json, status } = req.body as { title?: string; body_json?: string; status?: 'draft' | 'finalized' }
  const actor = req.session?.user_name ?? 'system'
  const now = new Date().toISOString()
  const { id } = req.params

  const existing = db.prepare('SELECT id, version FROM specs WHERE id = ?').get(id) as { id: string; version: number } | undefined
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const updates: string[] = []
  const vals: unknown[] = []
  if (title !== undefined) { updates.push('title = ?'); vals.push(title) }
  if (body_json !== undefined) { updates.push('body_json = ?'); vals.push(body_json) }
  if (status !== undefined) { updates.push('status = ?'); vals.push(status) }
  updates.push('version = ?', 'updated_at = ?', 'updated_by = ?')
  vals.push(existing.version + 1, now, actor, id)

  db.prepare(`UPDATE specs SET ${updates.join(', ')} WHERE id = ?`).run(...vals)

  const updated = db.prepare('SELECT * FROM specs WHERE id = ?').get(id)
  broadcast({ type: 'artifact_updated', payload: { type: 'spec', artifact: updated } })

  if (status === 'finalized') {
    createEvent('spec_revised', `Spec finalized: ${(updated as any).title}`, actor, {
      related_artifact_id: id, related_artifact_type: 'spec',
    })
  }
  res.json(updated)
})
