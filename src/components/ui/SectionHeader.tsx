import { type ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export default function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-3 mb-4 ${className}`}>
      <div>
        <h2 className="text-heading-md font-bold text-neutral-900 tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-label text-neutral-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
