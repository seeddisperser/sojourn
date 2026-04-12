import sharp from 'sharp'
import { resolve, join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { getDb } from '../db/schema.js'

export async function generateThumbnail(imageId: string, sourcePath: string, storageRoot: string): Promise<string> {
  const thumbDir = join(storageRoot, 'thumbnails')
  if (!existsSync(thumbDir)) {
    mkdirSync(thumbDir, { recursive: true })
  }

  const thumbFilename = `${imageId}_thumb.jpg`
  const thumbPath = resolve(thumbDir, thumbFilename)
  const relThumbPath = `thumbnails/${thumbFilename}`

  await sharp(sourcePath)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(thumbPath)

  getDb().prepare('UPDATE images SET thumbnail_path = ? WHERE id = ?').run(relThumbPath, imageId)
  return relThumbPath
}
