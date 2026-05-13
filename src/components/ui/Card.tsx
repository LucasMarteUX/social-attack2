import { type ReactNode } from 'react'

type Variant = 'default' | 'elevated' | 'muted' | 'lavender' | 'beet'

interface CardProps {
  variant?: Variant
  children: ReactNode
  className?: string
  onClick?: () => void
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-white border border-black/[0.06] shadow-sm',
  elevated: 'bg-white shadow-md',
  muted: 'bg-neutral-50 border border-neutral-100',
  lavender: 'bg-purple-50',
  beet: 'bg-pink-50',
}

export default function Card({
  variant = 'default',
  children,
  className = '',
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-xl p-5 ${variantClasses[variant]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
