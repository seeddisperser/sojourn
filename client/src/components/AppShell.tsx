import Inbox from './Inbox'
import ControlBar from './ControlBar'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-full">
      <ControlBar />
      <div className="flex flex-1 overflow-hidden">
        <Inbox />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
