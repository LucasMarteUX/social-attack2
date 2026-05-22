import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Zap } from 'lucide-react'
import { breadcrumbsFromPath } from '../../lib/breadcrumbs'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import AppTopBar from './AppTopBar'
import UserAvatar from './UserAvatar'

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()
  const isWorkspaceCanvas = pathname.startsWith('/workspace/')
  const mobileTitle =
    breadcrumbsFromPath(pathname).at(-1)?.label ?? 'Social Attack'

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-bg text-ink">
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <header className="flex md:hidden items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 bg-surface border-b border-line/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-line/[0.06] shrink-0"
              aria-label="Abrir menu"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center shrink-0">
                <Zap size={13} className="text-bg" fill="currentColor" />
              </div>
              <span className="text-body-md font-bold text-ink tracking-tight truncate">
                {mobileTitle}
              </span>
            </div>
          </div>
          <UserAvatar size="sm" className="shrink-0" />
        </header>

        <AppTopBar />

        <main
          className={
            isWorkspaceCanvas
              ? 'flex-1 min-h-0 flex flex-col overflow-hidden p-0 bg-bg'
              : 'flex-1 min-h-0 overflow-y-auto px-4 py-5 pb-[max(20px,env(safe-area-inset-bottom))] md:px-10 md:py-8 md:pb-8'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
