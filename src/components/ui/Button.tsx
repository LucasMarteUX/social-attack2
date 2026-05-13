import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'soft'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-purple-700 text-white shadow-brand hover:bg-purple-800 disabled:opacity-50',
  secondary:
    'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50',
  soft:
    'bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50',
  ghost:
    'bg-transparent text-neutral-600 hover:bg-neutral-100 disabled:opacity-50',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
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
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
