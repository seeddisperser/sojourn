import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

type MessageHandler = (msg: { type: string; payload: unknown; timestamp?: string }) => void

let globalHandlers: MessageHandler[] = []
let globalWs: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connect(onConnect: () => void, onDisconnect: () => void) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${window.location.host}/ws`
  const ws = new WebSocket(url)
  globalWs = ws

  ws.onopen = () => {
    onConnect()
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string)
      for (const handler of globalHandlers) {
        handler(msg)
      }
    } catch (e) {
      console.error('WS parse error:', e)
    }
  }

  ws.onclose = () => {
    onDisconnect()
    globalWs = null
    reconnectTimer = setTimeout(() => connect(onConnect, onDisconnect), 3000)
  }

  ws.onerror = () => {
    ws.close()
  }
}

export function useWebSocket(onMessage?: MessageHandler) {
  const setWsConnected = useStore(s => s.setWsConnected)
  const addOnlineUser = useStore(s => s.addOnlineUser)
  const removeOnlineUser = useStore(s => s.removeOnlineUser)
  const incrementUnread = useStore(s => s.incrementUnread)
  const handlerRef = useRef<MessageHandler | null>(null)

  // Core handler for global state updates
  const coreHandler = useCallback((msg: { type: string; payload: unknown }) => {
    const p = msg.payload as Record<string, unknown>
    if (msg.type === 'user_online') addOnlineUser(p.userName as string)
    if (msg.type === 'user_offline') removeOnlineUser(p.userName as string)
    if (msg.type === 'event') incrementUnread()
    onMessage?.(msg)
  }, [addOnlineUser, removeOnlineUser, incrementUnread, onMessage])

  useEffect(() => {
    const handler = coreHandler
    handlerRef.current = handler
    globalHandlers.push(handler)

    connect(
      () => setWsConnected(true),
      () => setWsConnected(false)
    )

    return () => {
      globalHandlers = globalHandlers.filter(h => h !== handler)
    }
  }, [coreHandler, setWsConnected])
}
