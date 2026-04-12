import { Router } from 'express'
import multer from 'multer'
import { mkdirSync, existsSync } from 'fs'
import { resolve, extname, join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { getConfig } from '../config.js'
import { generateThumbnail } from '../images/thumbnail.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'
import type { AuthRequest } from '../middleware/requireAuth.js'

export const imagesRouter = Router()

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
])

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif'])

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const config = getConfig()
    const dateDir = new Date().toISOString().slice(0, 10)
    const destDir = resolve(config.storage_root, dateDir)
    mkdirSync(destDir, { recursive: true })
    cb(null, destDir)
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

function getUpload() {
  const config = getConfig()
  return multer({
    storage,
    limits: { fileSize: config.max_upload_mb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase()
      if (ALLOWED_MIME_TYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
        cb(null, true)
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`))
      }
    },
  })
}

imagesRouter.post('/images/upload', (req: AuthRequest, res, next) => {
  getUpload().single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: `File too large. Maximum size: ${getConfig().max_upload_mb}MB` })
        return
      }
      res.status(400).json({ error: err.message })
      return
    }
    if (err) {
      res.status(400).json({ error: err.message })
      return
    }
    next()
  })
}, async (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  const config = getConfig()
  const db = getDb()
  const now = new Date().toISOString()
  const dateDir = now.slice(0, 10)
  const filename = req.file.filename
  const relPath = `${dateDir}/${filename}`
  const id = filename.replace(/\.[^.]+$/, '') // UUID is the filename without extension

  db.prepare(`
    INSERT INTO images (id, file_path, created_at, created_by)
    VALUES (?, ?, ?, ?)
  `).run(id, relPath, now, req.session?.user_name ?? 'system')

  // Async thumbnail generation
  const fullPath = resolve(config.storage_root, relPath)
  generateThumbnail(id, fullPath, config.storage_root)
    .then(() => {
      const img = db.prepare('SELECT * FROM images WHERE id = ?').get(id)
      broadcast({ type: 'artifact_updated', payload: { type: 'image', artifact: img } })
    })
    .catch(err => console.error(`Thumbnail failed for ${id}:`, err))

  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(id)
  broadcast({ type: 'artifact_created', payload: { type: 'image', artifact: image } })
  createEvent('image_added', 'Image uploaded', req.session?.user_name ?? 'system', {
    related_artifact_id: id,
    related_artifact_type: 'image',
  })

  res.status(201).json(image)
})

imagesRouter.get('/images', (req: AuthRequest, res) => {
  const db = getDb()
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const images = db.prepare('SELECT * FROM images ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset)
  res.json(images)
})

imagesRouter.patch('/images/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { caption, tags } = req.body as { caption?: string; tags?: string[] }
  const { id } = req.params

  const image = db.prepare('SELECT id FROM images WHERE id = ?').get(id)
  if (!image) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  if (caption !== undefined) {
    db.prepare('UPDATE images SET caption = ? WHERE id = ?').run(caption, id)
  }
  if (tags !== undefined) {
    db.prepare('DELETE FROM artifact_tags WHERE artifact_id = ? AND artifact_type = ?').run(id, 'image')
    for (const tag of tags) {
      db.prepare('INSERT OR IGNORE INTO artifact_tags VALUES (?, ?, ?)').run(id, 'image', tag)
    }
  }

  const updated = db.prepare('SELECT * FROM images WHERE id = ?').get(id)
  broadcast({ type: 'artifact_updated', payload: { type: 'image', artifact: updated } })
  res.json(updated)
})

imagesRouter.get('/images/:id/thumbnail', (req: AuthRequest, res) => {
  const db = getDb()
  const config = getConfig()
  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as { thumbnail_path?: string; file_path: string } | undefined

  if (!image) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const servePath = image.thumbnail_path ?? image.file_path
  res.sendFile(resolve(config.storage_root, servePath))
})

imagesRouter.get('/images/:id/full', (req: AuthRequest, res) => {
  const db = getDb()
  const config = getConfig()
  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as { file_path: string } | undefined

  if (!image) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  res.sendFile(resolve(config.storage_root, image.file_path))
})
