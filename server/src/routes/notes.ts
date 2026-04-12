import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'
import { writeNoteToVaultInbox } from '../watchers/obsidian.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const notesRouter = Router()

notesRouter.post('/notes', (req: AuthRequest, res) => {
  const { title = 'Untitled', content = '', tags = [] } = req.body as { title?: string; content?: string; tags?: string[] }
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  const actor = req.session?.user_name ?? 'system'

  db.prepare(`
    INSERT INTO notes (id, title, content, source_path, created_at, updated_at, created_by, updated_by)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
  `).run(id, title, content, now, now, actor, actor)

  for (const tag of tags) {
    db.prepare('INSERT OR IGNORE INTO artifact_tags VALUES (?, ?, ?)').run(id, 'note', tag)
  }

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
  broadcast({ type: 'artifact_created', payload: { type: 'note', artifact: note } })
  createEvent('note_added', `Note created: ${title}`, actor, {
    related_artifact_id: id,
    related_artifact_type: 'note',
  })

  // Write back to vault inbox since source_path is null
  try {
    writeNoteToVaultInbox(id, title, content, tags)
  } catch (err) {
    console.warn('Could not write note to vault inbox:', err)
  }

  res.status(201).json(note)
})

notesRouter.get('/notes/:id', (req: AuthRequest, res) => {
  const note = getDb().prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
  if (!note) { res.status(404).json({ error: 'Not found' }); return }
  res.json(note)
})

notesRouter.patch('/notes/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { title, content, tags } = req.body as { title?: string; content?: string; tags?: string[] }
  const actor = req.session?.user_name ?? 'system'
  const now = new Date().toISOString()
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM notes WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const updates: string[] = []
  const vals: unknown[] = []
  if (title !== undefined) { updates.push('title = ?'); vals.push(title) }
  if (content !== undefined) { updates.push('content = ?'); vals.push(content) }
  updates.push('updated_at = ?', 'updated_by = ?')
  vals.push(now, actor, id)

  db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`).run(...vals)

  if (tags !== undefined) {
    db.prepare('DELETE FROM artifact_tags WHERE artifact_id = ? AND artifact_type = ?').run(id, 'note')
    for (const tag of tags) {
      db.prepare('INSERT OR IGNORE INTO artifact_tags VALUES (?, ?, ?)').run(id, 'note', tag)
    }
  }

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
  broadcast({ type: 'artifact_updated', payload: { type: 'note', artifact: updated } })
  res.json(updated)
})
