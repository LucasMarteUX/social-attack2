import { Pencil, Trash2, Lightbulb, Palette, ArrowUpRight } from 'lucide-react'
import { type Categoria } from '../../data/mock'

interface CategoryCardProps {
  categoria: Categoria
  ideias: number
  criativos: number
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}

export default function CategoryCard({
  categoria,
  ideias,
  criativos,
  onEdit,
  onDelete,
  onClick,
}: CategoryCardProps) {
  return (
    <div
      className="group relative rounded-3xl bg-white border border-neutral-100 shadow-card hover:shadow-lg transition-all cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Background decorativo */}
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30"
        style={{ backgroundColor: categoria.cor }}
      />

      <div className="relative p-6">
        {/* Header: ícone + ações */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-heading-md flex-shrink-0 shadow-sm"
            style={{ backgroundColor: categoria.cor }}
          >
            {categoria.nome[0].toUpperCase()}
          </div>

          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Nome e descrição */}
        <div className="mb-5">
          <h3 className="text-heading-sm font-bold text-neutral-900 tracking-tight mb-1 line-clamp-1">
            {categoria.nome}
          </h3>
          {categoria.descricao && (
            <p className="text-label text-neutral-500 line-clamp-2 leading-relaxed">
              {categoria.descricao}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={14} className="text-neutral-400" />
              <span className="text-label font-semibold text-neutral-700">{ideias}</span>
              <span className="text-label text-neutral-400">ideias</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Palette size={14} className="text-neutral-400" />
              <span className="text-label font-semibold text-neutral-700">{criativos}</span>
              <span className="text-label text-neutral-400">criativos</span>
            </div>
          </div>

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
            style={{ backgroundColor: `${categoria.cor}15`, color: categoria.cor }}
          >
            <ArrowUpRight size={15} />
          </div>
        </div>
      </div>
    </div>
  )
}
