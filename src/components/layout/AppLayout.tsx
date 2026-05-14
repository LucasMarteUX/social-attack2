import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Zap } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import AppTopBar from './AppTopBar'

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-ink">
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-surface border-b border-line/[0.08] flex-shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-line/[0.06]"
            aria-label="Abrir menu"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center shrink-0">
              <Zap size={13} className="text-bg" fill="currentColor" />
            </div>
            <span className="text-body-md font-bold text-ink tracking-tight truncate">Social Attack</span>
          </div>
        </header>

        <AppTopBar />

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
