import chokidar from 'chokidar'
import { existsSync, copyFileSync, mkdirSync } from 'fs'
import { resolve, extname, basename } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { getConfig } from '../config.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'
import { generateThumbnail } from '../images/thumbnail.js'

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif'])

export function startImageWatchers(): void {
  const config = getConfig()
  const dirs = config.image_watch_dirs ?? []

  if (dirs.length === 0) return

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      console.warn(`[images] watch dir does not exist: ${dir}`)
      continue
    }

    const watcher = chokidar.watch(dir, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
    })

    watcher.on('add', (filePath) => ingestImage(filePath))
    watcher.on('error', (err) => console.error(`[images] watcher error (${dir}):`, err))
    console.log(`[images] watching: ${dir}`)
  }
}

async function ingestImage(filePath: string): Promise<void> {
  const ext = extname(filePath).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.has(ext)) return

  const db = getDb()
  const config = getConfig()

  // Check if already ingested
  const existing = db.prepare('SELECT id FROM images WHERE file_path = ?').get(filePath)
  if (existing) return

  try {
    const id = uuidv4()
    const now = new Date().toISOString()
    const dateDir = now.slice(0, 10)
    const destDir = resolve(config.storage_root, dateDir)
    mkdirSync(destDir, { recursive: true })

    const destFilename = `${id}${ext}`
    const destPath = resolve(destDir, destFilename)
    copyFileSync(filePath, destPath)

    const relPath = `${dateDir}/${destFilename}`

    db.prepare(`
      INSERT INTO images (id, file_path, created_at, created_by)
      VALUES (?, ?, ?, 'system')
    `).run(id, relPath, now)

    // Async thumbnail
    generateThumbnail(id, destPath, config.storage_root).then(() => {
      const img = db.prepare('SELECT * FROM images WHERE id = ?').get(id)
      broadcast({ type: 'artifact_updated', payload: { type: 'image', artifact: img } })
    }).catch(err => console.error(`[images] thumbnail failed for ${id}:`, err))

    const img = db.prepare('SELECT * FROM images WHERE id = ?').get(id)
    broadcast({ type: 'artifact_created', payload: { type: 'image', artifact: img } })

    createEvent('image_added', `Image added: ${basename(filePath)}`, 'system', {
      related_artifact_id: id,
      related_artifact_type: 'image',
    })
  } catch (err) {
    console.error(`[images] failed to ingest ${filePath}:`, err)
  }
}
