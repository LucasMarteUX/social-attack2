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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col">
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="absolute top-4 right-4 p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-line/[0.08]"
        >
          <X size={20} />
        </button>
        <Sidebar onNavClick={onClose} />
      </div>
    </div>
  )
}
