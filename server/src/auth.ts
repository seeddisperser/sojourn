import { createHash, randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from './db/schema.js'
import { getConfig } from './config.js'

export interface Session {
  id: string
  user_name: string
  token_hash: string
  created_at: string
  expires_at: string
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(userName: string): { sessionId: string; cookie: string } {
  const config = getConfig()
  const db = getDb()

  const sessionId = uuidv4()
  const sessionToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(sessionToken)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.session_duration_days * 24 * 60 * 60 * 1000)

  db.prepare(`
    INSERT INTO sessions (id, user_name, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userName, tokenHash, now.toISOString(), expiresAt.toISOString())

  const cookieValue = `${sessionId}:${sessionToken}`
  return { sessionId, cookie: cookieValue }
}

export function getSessionByToken(cookieValue: string): Session | null {
  const parts = cookieValue.split(':')
  if (parts.length !== 2) return null
  const [sessionId, sessionToken] = parts
  const tokenHash = hashToken(sessionToken)
  const db = getDb()

  const session = db.prepare(`
    SELECT * FROM sessions WHERE id = ? AND token_hash = ? AND expires_at > ?
  `).get(sessionId, tokenHash, new Date().toISOString()) as Session | undefined

  return session ?? null
}

export function deleteSession(sessionId: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
}

export function validateWorkspaceToken(token: string): boolean {
  return token === getConfig().auth_token
}
