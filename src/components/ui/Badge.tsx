type Variant = 'success' | 'warning' | 'alert' | 'critical' | 'neutral' | 'lavender' | 'cyan'

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantClasses: Record<Variant, string> = {
  success:
    'border border-green-500/25 bg-green-500/[0.1] text-green-800 dark:text-green-400',
  warning:
    'border border-teal-500/25 bg-teal-500/[0.12] text-teal-900 dark:text-teal-300',
  alert:
    'border border-coral-500/25 bg-coral-500/[0.12] text-coral-900 dark:text-coral-300',
  critical:
    'border border-red-500/25 bg-red-500/[0.1] text-red-800 dark:text-red-400',
  neutral:
    'border border-line/[0.12] bg-line/[0.06] text-ink-muted',
  lavender:
    'border border-line/[0.14] bg-line/[0.06] text-ink-muted',
  cyan:
    'border border-teal-500/25 bg-teal-500/[0.12] text-teal-900 dark:text-teal-300',
}

const dotColors: Record<Variant, string> = {
  success: 'bg-green-600 dark:bg-green-400',
  warning: 'bg-teal-600 dark:bg-teal-400',
  alert: 'bg-coral-600 dark:bg-coral-400',
  critical: 'bg-red-600 dark:bg-red-400',
  neutral: 'bg-ink-faint',
  lavender: 'bg-ink-muted dark:bg-ink-muted',
  cyan: 'bg-teal-600 dark:bg-teal-400',
}

export default function Badge({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold tracking-tight ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
