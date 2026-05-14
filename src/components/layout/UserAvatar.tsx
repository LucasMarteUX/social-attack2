import { useAuth } from '../../hooks/useAuth'

interface Props {
  size?: 'sm' | 'md'
  className?: string
  ringOffsetClass?: string
}

export default function UserAvatar({
  size = 'sm',
  className = '',
  ringOffsetClass = 'ring-offset-surface',
}: Props) {
  const { user } = useAuth()
  const dim = size === 'md' ? 'w-9 h-9 text-xs' : 'w-8 h-8 text-[11px]'

  return (
    <div
      className={`rounded-full ${dim} flex items-center justify-center font-bold uppercase text-ink bg-line/[0.1] ring-2 ring-[#FB923C] ring-offset-2 shrink-0 ${ringOffsetClass} ${className}`}
      aria-hidden
    >
      {user?.email?.[0] ?? '?'}
    </div>
  )
}
