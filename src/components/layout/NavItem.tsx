import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface NavItemProps {
  to: string
  icon: ReactNode
  label: string
  onClick?: () => void
  end?: boolean
}

export default function NavItem({ to, icon, label, onClick, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl text-body-sm font-medium transition-colors tracking-tight ${
          isActive
            ? 'bg-accent/[0.12] text-accent border border-accent/15'
            : 'text-ink-muted border border-transparent hover:bg-line/[0.05] hover:text-ink'
        }`
      }
    >
      <span className="shrink-0 opacity-90 [&>svg]:shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}
