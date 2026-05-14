import {
  LayoutDashboard,
  FolderOpen,
  Palette,
  CalendarDays,
  CheckSquare,
  Zap,
  Mic2,
  Workflow,
  Layers,
  LogOut,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import NavItem from './NavItem'
import ThemeToggle from '../ui/ThemeToggle'
import UserAvatar from './UserAvatar'
import { useAuth } from '../../hooks/useAuth'

const iconProps = { size: 18, strokeWidth: 1.5 } as const

interface SidebarProps {
  onNavClick?: () => void
}

export default function Sidebar({ onNavClick }: SidebarProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col h-full w-[240px] min-w-[240px] bg-bg border-r border-line/[0.06] px-3 py-5">
      <div className="flex items-center gap-2.5 px-2 mb-6">
        <div className="w-9 h-9 bg-ink rounded-xl flex items-center justify-center shrink-0">
          <Zap size={17} className="text-bg" fill="currentColor" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-body-md font-bold text-ink leading-tight tracking-tight truncate">
            Social Attack
          </span>
          <span className="text-[10px] text-ink-faint leading-tight">Conteúdo com IA</span>
        </div>
      </div>

      <Link
        to="/workspace/novo"
        onClick={onNavClick}
        className="mb-6 mx-1 flex items-center justify-center gap-2 rounded-xl bg-accent text-bg font-semibold text-body-sm py-2.5 px-3 hover:bg-accent-strong transition-colors tracking-tight shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <Plus size={18} strokeWidth={2} />
        Criar
      </Link>

      <nav className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto">
        <NavItem
          to="/"
          icon={<LayoutDashboard {...iconProps} />}
          label="Dashboard"
          onClick={onNavClick}
          end
        />

        <p className="px-3 mt-5 mb-1.5 text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em]">
          Nodes
        </p>
        <NavItem to="/workspace" icon={<Workflow {...iconProps} />} label="Workspace" onClick={onNavClick} />
        <NavItem
          to="/design-systems"
          icon={<Layers {...iconProps} />}
          label="Design Systems"
          onClick={onNavClick}
        />

        <p className="px-3 mt-5 mb-1.5 text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em]">
          Conteúdo
        </p>
        <NavItem to="/categorias" icon={<FolderOpen {...iconProps} />} label="Categorias" onClick={onNavClick} />
        <NavItem to="/criativos" icon={<Palette {...iconProps} />} label="Criativos" onClick={onNavClick} />
        <NavItem to="/tom-de-voz" icon={<Mic2 {...iconProps} />} label="Tom de Voz" onClick={onNavClick} />

        <p className="px-3 mt-5 mb-1.5 text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em]">
          Planejamento
        </p>
        <NavItem to="/agenda" icon={<CalendarDays {...iconProps} />} label="Agenda" onClick={onNavClick} />
        <NavItem to="/todos" icon={<CheckSquare {...iconProps} />} label="To-Do" onClick={onNavClick} />
      </nav>

      <div className="mt-auto border-t border-line/[0.06] pt-4 flex items-center gap-2 px-1">
        <UserAvatar ringOffsetClass="ring-offset-bg" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink truncate">{user?.email}</p>
          <p className="text-[10px] text-ink-faint">Administrador</p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={signOut}
          title="Sair"
          aria-label="Sair"
          className="p-1.5 rounded-lg text-ink-muted hover:text-red-500 hover:bg-line/[0.06] transition-colors shrink-0"
        >
          <LogOut size={15} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
