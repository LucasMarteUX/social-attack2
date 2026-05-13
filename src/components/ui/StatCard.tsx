import { type ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

type Tone = 'lavender' | 'lime' | 'cyan' | 'sunset' | 'beet' | 'white'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  description?: string
  icon?: ReactNode
  tone?: Tone
  className?: string
}

const toneClasses: Record<Tone, string> = {
  lavender: 'bg-lavender-gradient',
  lime: 'bg-lime-gradient',
  cyan: 'bg-cyan-gradient',
  sunset: 'bg-sunset-gradient',
  beet: 'bg-beet-gradient',
  white: 'bg-white border border-neutral-100',
}

const trendClasses: Record<'up' | 'down' | 'neutral', string> = {
  up: 'bg-green-100 text-green-700',
  down: 'bg-coral-50 text-coral-800',
  neutral: 'bg-neutral-100 text-neutral-600',
}

export default function StatCard({
  label,
  value,
  unit,
  trend,
  description,
  icon,
  tone = 'white',
  className = '',
}: StatCardProps) {
  return (
    <div className={`rounded-3xl p-5 shadow-card flex flex-col gap-3 ${toneClasses[tone]} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-label text-neutral-600 font-medium">{label}</span>
        {icon && <div className="text-neutral-500">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-display-md font-bold text-neutral-900 tracking-tight leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-body-md text-neutral-500 font-medium">{unit}</span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto">
        {trend && (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${trendClasses[trend.direction]}`}
          >
            {trend.direction === 'up' && <ArrowUpRight size={12} />}
            {trend.direction === 'down' && <ArrowDownRight size={12} />}
            {trend.value}
          </div>
        )}
        {description && (
          <span className="text-label text-neutral-500">{description}</span>
        )}
      </div>
    </div>
  )
}
