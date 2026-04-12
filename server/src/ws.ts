import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Server } from 'http'
import { getSessionByToken } from './auth.js'

export interface WsMessage {
  type: string
  payload: unknown
  timestamp?: string
}

interface AuthenticatedSocket extends WebSocket {
  userName?: string
  sessionId?: string
}

const clients = new Set<AuthenticatedSocket>()

export function setupWss(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: AuthenticatedSocket, req: IncomingMessage) => {
    // Extract session token from cookie
    const cookieHeader = req.headers.cookie ?? ''
    const match = cookieHeader.match(/sojourn_session=([^;]+)/)
    const sessionToken = match?.[1]

    if (!sessionToken) {
      ws.close(4001, 'Unauthorized')
      return
    }

    const session = getSessionByToken(sessionToken)
    if (!session) {
      ws.close(4001, 'Unauthorized')
      return
    }

    ws.userName = session.user_name
    ws.sessionId = session.id
    clients.add(ws)

    // Announce presence
    broadcastRaw({
      type: 'user_online',
      payload: { userName: session.user_name },
      timestamp: new Date().toISOString(),
    }, ws)

    ws.on('close', () => {
      clients.delete(ws)
      broadcastRaw({
        type: 'user_offline',
        payload: { userName: ws.userName },
        timestamp: new Date().toISOString(),
      })
    })

    ws.on('error', (err) => {
      console.error(`WebSocket error for ${ws.userName}:`, err.message)
    })
  })

  return wss
}

export function broadcast(msg: WsMessage, exclude?: WebSocket): void {
  const data = JSON.stringify({ ...msg, timestamp: msg.timestamp ?? new Date().toISOString() })
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

function broadcastRaw(msg: WsMessage, exclude?: WebSocket): void {
  broadcast(msg, exclude)
}

export function getOnlineUsers(): string[] {
  return Array.from(clients)
    .filter(c => c.readyState === WebSocket.OPEN && c.userName)
    .map(c => c.userName!)
}
