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
    wrap: 'border border-line/[0.12] bg-accent/[0.06]',
    iconBg: 'bg-accent text-white',
    labelClass: 'text-ink-muted',
  },
  lavender: {
    wrap: 'border border-line/[0.1] bg-surface-2',
    iconBg: 'bg-ink text-bg',
    labelClass: 'text-ink-muted',
  },
  sunset: {
    wrap: 'border border-line/[0.14] bg-line/[0.04]',
    iconBg: 'bg-surface-3 text-ink',
    labelClass: 'text-ink-muted',
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
          <Sparkles size={13} />
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
