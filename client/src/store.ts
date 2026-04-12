import { create } from 'zustand'

export interface UserState {
  userName: string | null
  setUser: (name: string | null) => void
}

export interface OnlineUser {
  userName: string
}

export interface AppState {
  userName: string | null
  setUser: (name: string | null) => void

  onlineUsers: string[]
  setOnlineUsers: (users: string[]) => void
  addOnlineUser: (user: string) => void
  removeOnlineUser: (user: string) => void

  unreadCount: number
  incrementUnread: () => void
  clearUnread: () => void

  wsConnected: boolean
  setWsConnected: (v: boolean) => void

  activeBuildsCount: number
  setActiveBuildsCount: (n: number) => void

  inboxFilter: string
  setInboxFilter: (f: string) => void
}

export const useStore = create<AppState>((set) => ({
  userName: null,
  setUser: (name) => set({ userName: name }),

  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addOnlineUser: (user) => set((s) => ({ onlineUsers: [...new Set([...s.onlineUsers, user])] })),
  removeOnlineUser: (user) => set((s) => ({ onlineUsers: s.onlineUsers.filter(u => u !== user) })),

  unreadCount: 0,
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),

  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  activeBuildsCount: 0,
  setActiveBuildsCount: (n) => set({ activeBuildsCount: n }),

  inboxFilter: 'all',
  setInboxFilter: (f) => set({ inboxFilter: f }),
}))
