import { Router } from 'express'
import { createSession, deleteSession, validateWorkspaceToken } from '../auth.js'
import { getConfig } from '../config.js'
import type { AuthRequest } from '../middleware/requireAuth.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { token, userName } = req.body as { token?: string; userName?: string }

  if (!token || !userName?.trim()) {
    res.status(400).json({ error: 'token and userName are required' })
    return
  }

  if (!validateWorkspaceToken(token)) {
    res.status(401).json({ error: 'Invalid workspace token' })
    return
  }

  const config = getConfig()
  const { cookie } = createSession(userName.trim())
  const maxAge = config.session_duration_days * 24 * 60 * 60 * 1000

  res.cookie('sojourn_session', cookie, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge,
    path: '/',
  })

  res.json({ ok: true, userName: userName.trim() })
})

authRouter.post('/logout', requireAuth, (req: AuthRequest, res) => {
  if (req.session) {
    deleteSession(req.session.id)
  }
  res.clearCookie('sojourn_session')
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ userName: req.session?.user_name })
})
