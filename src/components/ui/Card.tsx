import { type ReactNode } from 'react'

type Variant = 'default' | 'elevated' | 'muted' | 'accent' | 'ghost'

interface CardProps {
  variant?: Variant
  children: ReactNode
  className?: string
  onClick?: () => void
}

const variantClasses: Record<Variant, string> = {
  default:  'bg-surface border border-line/[0.08]',
  elevated: 'bg-surface-2 border border-line/[0.08]',
  muted:    'bg-surface-2',
  accent:   'bg-accent/[0.06] border border-accent/[0.18]',
  ghost:    'bg-transparent border border-line/[0.08]',
}

export default function Card({
  variant = 'default',
  children,
  className = '',
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-2xl p-5 ${variantClasses[variant]} ${onClick ? 'cursor-pointer hover:border-line/[0.18] transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
