import { LayoutDashboard, FolderOpen, Palette, CalendarDays, CheckSquare, Zap, Mic2, Workflow, Layers, LogOut } from 'lucide-react'
import NavItem from './NavItem'
import ThemeToggle from '../ui/ThemeToggle'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  onNavClick?: () => void
}

export default function Sidebar({ onNavClick }: SidebarProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col h-full w-64 bg-bg border-r border-line/[0.06] px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-10">
        <div className="w-9 h-9 bg-ink rounded-xl flex items-center justify-center">
          <Zap size={17} className="text-bg" fill="currentColor" />
        </div>
        <div className="flex flex-col">
          <span className="text-body-md font-bold text-ink leading-tight tracking-tight">Social Attack</span>
          <span className="text-[10px] text-ink-faint leading-tight">Conteúdo com IA</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        <NavItem to="/" icon={<LayoutDashboard size={17} />} label="Dashboard" onClick={onNavClick} end />

        <p className="px-3 mt-5 mb-2 text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em]">
          Nodes
        </p>
        <NavItem to="/workspace" icon={<Workflow size={17} />} label="Workspace" onClick={onNavClick} />
        <NavItem to="/design-systems" icon={<Layers size={17} />} label="Design Systems" onClick={onNavClick} />

        <p className="px-3 mt-5 mb-2 text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em]">
          Conteúdo
        </p>
        <NavItem to="/categorias" icon={<FolderOpen size={17} />} label="Categorias" onClick={onNavClick} />
        <NavItem to="/criativos" icon={<Palette size={17} />} label="Criativos" onClick={onNavClick} />
        <NavItem to="/tom-de-voz" icon={<Mic2 size={17} />} label="Tom de Voz" onClick={onNavClick} />

        <p className="px-3 mt-5 mb-2 text-[10px] font-bold text-ink-faint uppercase tracking-[0.12em]">
          Planejamento
        </p>
        <NavItem to="/agenda" icon={<CalendarDays size={17} />} label="Agenda" onClick={onNavClick} />
        <NavItem to="/todos" icon={<CheckSquare size={17} />} label="To-Do" onClick={onNavClick} />
      </nav>

      {/* Footer — user + theme + logout */}
      <div className="mt-auto border-t border-line/[0.06] pt-4 flex items-center gap-2 px-1">
        <div className="w-8 h-8 rounded-full bg-line/[0.08] flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-ink uppercase">
            {user?.email?.[0] ?? 'A'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink truncate">{user?.email}</p>
          <p className="text-[10px] text-ink-faint">Administrador</p>
        </div>
        <ThemeToggle />
        <button
          onClick={signOut}
          title="Sair"
          aria-label="Sair"
          className="p-1.5 rounded-md text-ink-muted hover:text-red-500 hover:bg-line/[0.06] transition-colors flex-shrink-0"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  )
}
