import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Zap } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FBFAF9]">
      {/* Sidebar fixo — desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Drawer — mobile */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Área de conteúdo */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-white border-b border-neutral-100">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-700 rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" fill="white" />
            </div>
            <span className="text-body-md font-bold text-neutral-900 tracking-tight">Social Attack</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
