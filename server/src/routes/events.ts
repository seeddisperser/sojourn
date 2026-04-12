import { Router } from 'express'
import { getDb } from '../db/schema.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const eventsRouter = Router()

eventsRouter.get('/events', (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const type = req.query.type as string | undefined
  const place = req.query.place as string | undefined

  const db = getDb()
  let query = 'SELECT * FROM events'
  const params: unknown[] = []
  const conditions: string[] = []

  if (type) {
    const types = type.split(',')
    conditions.push(`type IN (${types.map(() => '?').join(',')})`)
    params.push(...types)
  }

  if (place) {
    const placeTypes: Record<string, string[]> = {
      archive: ['note_added', 'note_updated', 'image_added'],
      notary: ['spec_created', 'spec_revised'],
      workshop: ['build_started', 'build_finished', 'build_failed', 'hinge_point_surfaced', 'cost_threshold_crossed', 'preview_available'],
    }
    const typeList = placeTypes[place] ?? []
    if (typeList.length > 0) {
      conditions.push(`type IN (${typeList.map(() => '?').join(',')})`)
      params.push(...typeList)
    }
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const events = db.prepare(query).all(...params)
  const total = (db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }).count
  res.json({ events, total, limit, offset })
})
