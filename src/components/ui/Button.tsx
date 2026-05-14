import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'soft' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  loading?: boolean
  className?: string
}

const variantClasses: Record<Variant, string> = {
  // Monocromático — invertido pelo tema (branco em dark, preto em light)
  primary:
    'bg-ink text-bg hover:bg-ink/90 disabled:opacity-40',
  secondary:
    'bg-surface border border-line/[0.1] text-ink hover:bg-surface-2 hover:border-line/[0.18] disabled:opacity-40',
  soft:
    'bg-line/[0.06] text-ink hover:bg-line/[0.1] disabled:opacity-40',
  ghost:
    'bg-transparent text-ink-muted hover:text-ink hover:bg-line/[0.06] disabled:opacity-40',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-40',
  // Acento monocromático (contraste com bg — espelho dark/light)
  accent:
    'bg-accent text-bg hover:bg-accent-strong disabled:opacity-40',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-body-sm',
  md: 'px-4 py-2 text-body-md',
  lg: 'px-5 py-2.5 text-body-md',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
