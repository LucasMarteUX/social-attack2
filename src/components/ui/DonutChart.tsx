import { type ReactNode } from 'react'

export interface DonutSegment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerLabel?: ReactNode
  className?: string
}

export default function DonutChart({
  segments,
  size = 180,
  thickness = 28,
  centerLabel,
  className = '',
}: DonutChartProps) {
  const total = segments.reduce((acc, s) => acc + s.value, 0)

  if (total === 0) {
    return (
      <div
        className={`relative rounded-full bg-surface-3 ${className}`}
        style={{ width: size, height: size }}
      >
        <div
          className="absolute rounded-full bg-bg flex items-center justify-center"
          style={{ inset: thickness }}
        >
          {centerLabel}
        </div>
      </div>
    )
  }

  let current = 0
  const stops = segments
    .map((s) => {
      const start = (current / total) * 100
      current += s.value
      const end = (current / total) * 100
      return `${s.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
      />
      <div
        className="absolute rounded-full bg-bg flex items-center justify-center"
        style={{ inset: thickness }}
      >
        {centerLabel}
      </div>
    </div>
  )
}
