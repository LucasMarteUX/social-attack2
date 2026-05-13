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
        `flex items-center gap-3 px-3 py-2 rounded-full text-body-md font-medium transition-colors ${
          isActive
            ? 'bg-purple-50 text-purple-700'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
