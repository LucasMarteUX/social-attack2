import { type ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

type Tone = 'beet' | 'lavender' | 'sunset'

interface AIInsightCardProps {
  title?: string
  children: ReactNode
  tone?: Tone
  className?: string
  action?: ReactNode
}

const toneClasses: Record<Tone, { wrap: string; iconBg: string; labelClass: string }> = {
  beet: {
    wrap: 'border border-accent/22 bg-accent/[0.08]',
    iconBg: 'bg-accent',
    labelClass: 'text-accent-strong dark:text-pink-300',
  },
  lavender: {
    wrap: 'border border-purple-500/22 bg-purple-500/[0.06]',
    iconBg: 'bg-purple-600',
    labelClass: 'text-purple-800 dark:text-purple-300',
  },
  sunset: {
    wrap: 'border border-coral-500/22 bg-coral-500/[0.08]',
    iconBg: 'bg-coral-600',
    labelClass: 'text-coral-900 dark:text-coral-300',
  },
}

export default function AIInsightCard({
  title = 'AI Insight',
  children,
  tone = 'beet',
  className = '',
  action,
}: AIInsightCardProps) {
  const t = toneClasses[tone]

  return (
    <div className={`rounded-2xl p-5 ${t.wrap} ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-full ${t.iconBg} flex items-center justify-center shrink-0`}>
          <Sparkles size={13} className="text-white" />
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${t.labelClass}`}>
          {title}
        </span>
      </div>
      <div className="text-body-md font-medium leading-relaxed text-ink">{children}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
