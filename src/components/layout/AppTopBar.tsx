import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { breadcrumbsFromPath } from '../../lib/breadcrumbs'
import UserAvatar from './UserAvatar'

export default function AppTopBar() {
  const { pathname } = useLocation()
  const crumbs = breadcrumbsFromPath(pathname)

  return (
    <header className="hidden md:flex items-center justify-between gap-4 px-10 py-3.5 flex-shrink-0 bg-surface border-b border-line/[0.06]">
      <nav aria-label="Trilha" className="flex items-center gap-1 min-w-0 text-body-md">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          const inner = (
            <span
              className={
                last
                  ? 'font-semibold text-ink truncate tracking-tight'
                  : 'font-medium text-ink-muted hover:text-ink transition-colors truncate'
              }
            >
              {c.label}
            </span>
          )
          return (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={14} className="text-ink-faint shrink-0" aria-hidden />}
              {!last && c.to ? (
                <Link to={c.to} className="min-w-0">
                  {inner}
                </Link>
              ) : (
                <span className="min-w-0">{inner}</span>
              )}
            </span>
          )
        })}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <UserAvatar size="sm" />
      </div>
    </header>
  )
}
