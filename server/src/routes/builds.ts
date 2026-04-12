import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { startBuild, stopBuild, createHingePoint, acknowledgeHingePoint } from '../builds/orchestrator.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const buildsRouter = Router()

buildsRouter.post('/builds', (req: AuthRequest, res) => {
  const { command, spec_id } = req.body as { command: string; spec_id?: string }
  if (!command?.trim()) {
    res.status(400).json({ error: 'command is required' })
    return
  }

  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  const actor = req.session?.user_name ?? 'system'

  db.prepare(`
    INSERT INTO build_sessions (id, spec_id, command, status, updated_at, created_by)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(id, spec_id ?? null, command.trim(), now, actor)

  if (spec_id) {
    db.prepare('INSERT OR IGNORE INTO spec_linked_builds VALUES (?, ?)').run(spec_id, id)
  }

  // Start immediately
  startBuild(id, command.trim(), actor)

  const session = db.prepare('SELECT * FROM build_sessions WHERE id = ?').get(id)
  res.status(201).json(session)
})

buildsRouter.get('/builds', (_req: AuthRequest, res) => {
  const sessions = getDb().prepare('SELECT * FROM build_sessions ORDER BY updated_at DESC').all()
  res.json(sessions)
})

buildsRouter.get('/builds/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const session = db.prepare('SELECT * FROM build_sessions WHERE id = ?').get(req.params.id)
  if (!session) { res.status(404).json({ error: 'Not found' }); return }
  const logs = db.prepare('SELECT * FROM build_logs WHERE build_session_id = ? ORDER BY id ASC').all(req.params.id)
  const hinge_points = db.prepare('SELECT * FROM hinge_points WHERE build_session_id = ? ORDER BY created_at ASC').all(req.params.id)
  res.json({ ...session as object, logs, hinge_points })
})

buildsRouter.delete('/builds/:id', (req: AuthRequest, res) => {
  const { id } = req.params
  const session = getDb().prepare('SELECT id, status FROM build_sessions WHERE id = ?').get(id) as { id: string; status: string } | undefined
  if (!session) { res.status(404).json({ error: 'Not found' }); return }
  if (session.status !== 'running') {
    res.status(400).json({ error: 'Build is not running' })
    return
  }
  stopBuild(id)
  res.json({ ok: true })
})

buildsRouter.post('/builds/:id/hinge-points', (req: AuthRequest, res) => {
  const { description } = req.body as { description: string }
  if (!description?.trim()) {
    res.status(400).json({ error: 'description is required' })
    return
  }
  const actor = req.session?.user_name ?? 'system'
  const hp_id = createHingePoint(req.params.id, description.trim(), 'user', actor)
  const hp = getDb().prepare('SELECT * FROM hinge_points WHERE id = ?').get(hp_id)
  res.status(201).json(hp)
})

buildsRouter.patch('/builds/:id/hinge-points/:hpId/acknowledge', (req: AuthRequest, res) => {
  const actor = req.session?.user_name ?? 'system'
  const hp = getDb().prepare('SELECT id FROM hinge_points WHERE id = ?').get(req.params.hpId)
  if (!hp) { res.status(404).json({ error: 'Not found' }); return }
  acknowledgeHingePoint(req.params.hpId, actor)
  const updated = getDb().prepare('SELECT * FROM hinge_points WHERE id = ?').get(req.params.hpId)
  res.json(updated)
})
