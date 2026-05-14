import { LayoutDashboard, FolderOpen, Palette, CalendarDays, CheckSquare, Zap, Mic2, Workflow, Layers, LogOut } from 'lucide-react'
import NavItem from './NavItem'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  onNavClick?: () => void
}

export default function Sidebar({ onNavClick }: SidebarProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-neutral-100 px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-10">
        <div className="w-9 h-9 bg-purple-700 rounded-xl flex items-center justify-center shadow-brand">
          <Zap size={17} className="text-white" fill="white" />
        </div>
        <div className="flex flex-col">
          <span className="text-body-md font-bold text-neutral-900 leading-tight tracking-tight">Social Attack</span>
          <span className="text-[10px] text-neutral-400 leading-tight">Conteúdo com IA</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        <NavItem to="/" icon={<LayoutDashboard size={17} />} label="Dashboard" onClick={onNavClick} end />

        <p className="px-3 mt-5 mb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em]">
          Nodes
        </p>
        <NavItem to="/workspace" icon={<Workflow size={17} />} label="Workspace" onClick={onNavClick} />
        <NavItem to="/design-systems" icon={<Layers size={17} />} label="Design Systems" onClick={onNavClick} />

        <p className="px-3 mt-5 mb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em]">
          Conteúdo
        </p>
        <NavItem to="/categorias" icon={<FolderOpen size={17} />} label="Categorias" onClick={onNavClick} />
        <NavItem to="/criativos" icon={<Palette size={17} />} label="Criativos" onClick={onNavClick} />
        <NavItem to="/tom-de-voz" icon={<Mic2 size={17} />} label="Tom de Voz" onClick={onNavClick} />

        <p className="px-3 mt-5 mb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em]">
          Planejamento
        </p>
        <NavItem to="/agenda" icon={<CalendarDays size={17} />} label="Agenda" onClick={onNavClick} />
        <NavItem to="/todos" icon={<CheckSquare size={17} />} label="To-Do" onClick={onNavClick} />
      </nav>

      {/* Footer — user + logout */}
      <div className="mt-auto border-t border-neutral-100 pt-4 flex items-center gap-3 px-1">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-purple-700 uppercase">
            {user?.email?.[0] ?? 'A'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-neutral-700 truncate">{user?.email}</p>
          <p className="text-[10px] text-neutral-400">Administrador</p>
        </div>
        <button
          onClick={signOut}
          title="Sair"
          className="text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  )
}
