import type { Request, Response, NextFunction } from 'express'
import { getSessionByToken } from '../auth.js'

export interface AuthRequest extends Request {
  session?: {
    id: string
    user_name: string
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const cookieValue = req.cookies?.sojourn_session
  if (!cookieValue) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const session = getSessionByToken(cookieValue)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  req.session = { id: session.id, user_name: session.user_name }
  next()
}
