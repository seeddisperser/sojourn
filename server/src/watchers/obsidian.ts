import chokidar from 'chokidar'
import matter from 'gray-matter'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, basename, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { getConfig } from '../config.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'

// Track files written by Sojourn to avoid re-ingesting them
const sojournWrittenFiles = new Set<string>()

export function startObsidianWatcher(): void {
  const config = getConfig()

  if (!existsSync(config.vault_path)) {
    console.warn(`[obsidian] vault_path does not exist: ${config.vault_path} — watcher will start when path becomes available`)
  }

  const watcher = chokidar.watch(config.vault_path, {
    ignored: [
      /(^|[/\\])\../, // dot files
      /\.obsidian/,
      /\.trash/,
    ],
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  })

  watcher.on('add', (filePath) => ingestFile(filePath, 'add'))
  watcher.on('change', (filePath) => ingestFile(filePath, 'change'))
  watcher.on('error', (err) => console.error('[obsidian] watcher error:', err))

  console.log(`[obsidian] watching vault: ${config.vault_path}`)
}

function ingestFile(filePath: string, event: 'add' | 'change'): void {
  if (!filePath.endsWith('.md')) return

  // Skip files we wrote ourselves
  if (sojournWrittenFiles.has(filePath)) return

  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = matter(raw)
    const title = (parsed.data?.title as string) ?? basename(filePath, '.md')
    const tags: string[] = Array.isArray(parsed.data?.tags) ? parsed.data.tags.map(String) : []
    const content = parsed.content.trim()
    const now = new Date().toISOString()
    const db = getDb()

    const existing = db.prepare('SELECT id FROM notes WHERE source_path = ?').get(filePath) as { id: string } | undefined

    if (existing) {
      // Update
      db.prepare(`
        UPDATE notes SET title = ?, content = ?, updated_at = ?, updated_by = 'system'
        WHERE id = ?
      `).run(title, content, now, existing.id)

      // Update tags
      db.prepare('DELETE FROM artifact_tags WHERE artifact_id = ? AND artifact_type = ?').run(existing.id, 'note')
      upsertTags(existing.id, 'note', tags)

      const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(existing.id)
      broadcast({ type: 'artifact_updated', payload: { type: 'note', artifact: note } })

      if (event === 'change') {
        createEvent('note_updated', `Note updated: ${title}`, 'system', {
          related_artifact_id: existing.id,
          related_artifact_type: 'note',
        })
      }
    } else {
      // Insert
      const id = uuidv4()
      db.prepare(`
        INSERT INTO notes (id, title, content, source_path, created_at, updated_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, 'system', 'system')
      `).run(id, title, content, filePath, now, now)

      upsertTags(id, 'note', tags)

      const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
      broadcast({ type: 'artifact_created', payload: { type: 'note', artifact: note } })

      createEvent('note_added', `Note added: ${title}`, 'system', {
        related_artifact_id: id,
        related_artifact_type: 'note',
      })
    }
  } catch (err) {
    console.error(`[obsidian] failed to ingest ${filePath}:`, err)
  }
}

export function writeNoteToVaultInbox(noteId: string, title: string, content: string, tags: string[]): void {
  const config = getConfig()
  const inboxPath = config.vault_inbox_path!

  if (!existsSync(inboxPath)) {
    mkdirSync(inboxPath, { recursive: true })
  }

  const safeTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
  const filename = `${timestamp}-${safeTitle || 'untitled'}.md`
  const filePath = resolve(inboxPath, filename)

  const fileContent = matter.stringify(content, {
    sojourn_id: noteId,
    created_at: new Date().toISOString(),
    tags,
  })

  // Mark as Sojourn-written before we write so the watcher ignores it
  sojournWrittenFiles.add(filePath)
  writeFileSync(filePath, fileContent, 'utf-8')

  // Update note's source_path so we don't write it again
  getDb().prepare('UPDATE notes SET source_path = ? WHERE id = ?').run(filePath, noteId)

  // Remove from the set after a short delay (watcher debounce period)
  setTimeout(() => sojournWrittenFiles.delete(filePath), 2000)
}

function upsertTags(artifactId: string, artifactType: string, tags: string[]): void {
  const db = getDb()
  const stmt = db.prepare('INSERT OR IGNORE INTO artifact_tags (artifact_id, artifact_type, tag) VALUES (?, ?, ?)')
  for (const tag of tags) {
    stmt.run(artifactId, artifactType, tag)
  }
}
