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

const toneClasses: Record<Tone, { bg: string; accent: string; text: string }> = {
  beet: { bg: 'bg-beet-gradient', accent: 'bg-pink-600', text: 'text-pink-800' },
  lavender: { bg: 'bg-lavender-gradient', accent: 'bg-purple-600', text: 'text-purple-800' },
  sunset: { bg: 'bg-sunset-gradient', accent: 'bg-coral-700', text: 'text-coral-800' },
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
    <div className={`rounded-3xl p-5 shadow-card ${t.bg} ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-full ${t.accent} flex items-center justify-center`}>
          <Sparkles size={13} className="text-white" />
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${t.text}`}>
          {title}
        </span>
      </div>
      <div className={`text-body-md font-medium leading-relaxed ${t.text}`}>
        {children}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
