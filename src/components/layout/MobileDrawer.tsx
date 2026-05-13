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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
        >
          <X size={20} />
        </button>
        <Sidebar onNavClick={onClose} />
      </div>
    </div>
  )
}
