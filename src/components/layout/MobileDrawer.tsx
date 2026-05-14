import { X } from 'lucide-react'
import Sidebar from './Sidebar'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex h-screen w-[240px] min-w-[240px] flex-col bg-bg shadow-2xl shadow-black/40 border-r border-line/[0.08]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="absolute top-3 right-3 z-20 p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-line/[0.08]"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
        <Sidebar onNavClick={onClose} />
      </div>
    </div>
  )
}
