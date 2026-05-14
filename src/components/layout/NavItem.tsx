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
        `flex items-center gap-3 px-3 py-2 rounded-lg text-body-md font-medium transition-colors ${
          isActive
            ? 'bg-line/[0.08] text-ink'
            : 'text-ink-muted hover:bg-line/[0.04] hover:text-ink'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
