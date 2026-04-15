import express from 'express'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { loadConfig } from './config.js'
import { initDb } from './db/schema.js'
import { setupWss } from './ws.js'
import { authRouter } from './routes/auth.js'
import { notesRouter } from './routes/notes.js'
import { imagesRouter } from './routes/images.js'
import { clustersRouter } from './routes/clusters.js'
import { specsRouter } from './routes/specs.js'
import { commentsRouter } from './routes/comments.js'
import { eventsRouter } from './routes/events.js'
import { buildsRouter } from './routes/builds.js'
import { artifactsRouter } from './routes/artifacts.js'
import { webhooksRouter } from './routes/webhooks.js'
import { requireAuth } from './middleware/requireAuth.js'
import { startWatchers } from './watchers/index.js'
import { recoverOrphanedBuilds } from './builds/orchestrator.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  // Load config
  const config = loadConfig()

  // Init database
  initDb()

  // Recover any orphaned builds from before restart
  recoverOrphanedBuilds()

  const app = express()
  const server = createServer(app)

  // Middleware
  app.use(cookieParser())
  app.use(express.json({ limit: '10mb' }))

  // Request logging
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
    next()
  })

  // Auth routes (no auth required)
  app.use('/api/auth', authRouter)

  // All other API routes require auth
  app.use('/api', requireAuth, notesRouter)
  app.use('/api', requireAuth, imagesRouter)
  app.use('/api', requireAuth, clustersRouter)
  app.use('/api', requireAuth, specsRouter)
  app.use('/api', requireAuth, commentsRouter)
  app.use('/api', requireAuth, eventsRouter)
  app.use('/api', requireAuth, buildsRouter)
  app.use('/api', requireAuth, artifactsRouter)
  app.use('/api', requireAuth, webhooksRouter)

  // Serve client build (production)
  const clientDist = resolve(__dirname, '../../client/dist')
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('*', (_req, res) => {
      res.sendFile(resolve(clientDist, 'index.html'))
    })
  } else {
    app.get('/', (_req, res) => {
      res.json({ status: 'Sojourn server running', note: 'Build the client to serve the UI' })
    })
  }

  // Error handling
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: err.message ?? 'Internal server error' })
  })

  // WebSocket
  setupWss(server)

  // Start file watchers
  startWatchers()

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Sojourn running on http://0.0.0.0:${config.port}`)
    console.log(`Vault: ${config.vault_path}`)
    console.log(`Storage: ${config.storage_root}`)
  })
}

main().catch(err => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
