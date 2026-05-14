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
  lavender: 'bg-lavender-gradient border border-purple-500/15 dark:border-purple-500/25',
  lime: 'border border-green-500/20 bg-green-500/[0.06] dark:bg-green-500/[0.08]',
  cyan: 'border border-teal-500/20 bg-teal-500/[0.06] dark:bg-teal-500/[0.08]',
  sunset: 'border border-coral-500/20 bg-coral-500/[0.06] dark:bg-coral-500/[0.08]',
  beet: 'border border-accent/25 bg-accent/[0.06]',
  white: 'bg-surface border border-line/[0.08]',
}

const trendClasses: Record<'up' | 'down' | 'neutral', string> = {
  up: 'border border-green-500/25 bg-green-500/[0.1] text-green-800 dark:text-green-400',
  down: 'border border-coral-500/25 bg-coral-500/[0.1] text-coral-900 dark:text-coral-300',
  neutral: 'border border-line/[0.12] bg-line/[0.06] text-ink-muted',
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
    <div
      className={`rounded-2xl p-5 flex flex-col gap-3 ${toneClasses[tone]} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-label text-ink-muted font-medium">{label}</span>
        {icon && <div className="text-ink-faint">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-display-md font-bold text-ink tracking-tight leading-none">
          {value}
        </span>
        {unit && <span className="text-body-md text-ink-muted font-medium">{unit}</span>}
      </div>

      <div className="flex items-center gap-2 mt-auto flex-wrap">
        {trend && (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[11px] font-semibold ${trendClasses[trend.direction]}`}
          >
            {trend.direction === 'up' && <ArrowUpRight size={12} />}
            {trend.direction === 'down' && <ArrowDownRight size={12} />}
            {trend.value}
          </div>
        )}
        {description && <span className="text-label text-ink-muted">{description}</span>}
      </div>
    </div>
  )
}
