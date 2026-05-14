import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />,
  error: <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0" />,
  info: <Info size={16} className="text-accent shrink-0" />,
}

const STYLES: Record<ToastType, string> = {
  success: 'border-green-500/20 bg-surface-2',
  error: 'border-red-500/20 bg-surface-2',
  info: 'border-accent/25 bg-surface-2',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (message: string, type: ToastType) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((p) => [...p, { id, message, type }])
      setTimeout(() => remove(id), 4000)
    },
    [remove]
  )

  const value: ToastContextValue = {
    success: (msg) => add(msg, 'success'),
    error: (msg) => add(msg, 'error'),
    info: (msg) => add(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border border-line/[0.08] ${STYLES[t.type]} min-w-[260px] max-w-sm animate-slide-up`}
          >
            {ICONS[t.type]}
            <p className="text-body-md font-medium text-ink flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="text-ink-faint hover:text-ink transition-colors shrink-0 rounded-lg p-0.5 hover:bg-line/[0.08]"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
