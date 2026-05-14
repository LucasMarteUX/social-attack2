import { LayoutDashboard, FolderOpen, Palette, CalendarDays, CheckSquare, Zap, Mic2, Workflow, Layers } from 'lucide-react'
import NavItem from './NavItem'

interface SidebarProps {
  onNavClick?: () => void
}

export default function Sidebar({ onNavClick }: SidebarProps) {
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

      {/* Footer card */}
      <div className="mt-auto rounded-2xl bg-lavender-gradient p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800 mb-1">
          Plano Free
        </p>
        <p className="text-label text-purple-900/70 leading-snug mb-3">
          Você usou 3 de 10 gerações deste mês.
        </p>
        <button className="text-label font-semibold text-purple-800 hover:text-purple-900 transition-colors">
          Fazer upgrade →
        </button>
      </div>
    </div>
  )
}
