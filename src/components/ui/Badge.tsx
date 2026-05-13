type Variant = 'success' | 'warning' | 'alert' | 'critical' | 'neutral' | 'lavender' | 'cyan'

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantClasses: Record<Variant, string> = {
  success: 'bg-green-50 text-green-700',
  warning: 'bg-teal-50 text-teal-700',
  alert: 'bg-coral-50 text-coral-800',
  critical: 'bg-red-50 text-red-700',
  neutral: 'bg-neutral-100 text-neutral-600',
  lavender: 'bg-purple-50 text-purple-700',
  cyan: 'bg-teal-50 text-teal-700',
}

const dotColors: Record<Variant, string> = {
  success: 'bg-green-600',
  warning: 'bg-teal-600',
  alert: 'bg-coral-700',
  critical: 'bg-red-600',
  neutral: 'bg-neutral-400',
  lavender: 'bg-purple-600',
  cyan: 'bg-teal-600',
}

export default function Badge({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
