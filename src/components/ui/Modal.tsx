import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export default function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          {title && <h2 className="text-heading-sm font-semibold text-neutral-900">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
