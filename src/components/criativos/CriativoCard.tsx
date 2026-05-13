import { useNavigate } from 'react-router-dom'
import { Trash2, Eye } from 'lucide-react'
import Badge from '../ui/Badge'
import { type Criativo, type Categoria } from '../../data/mock'

type StatusVariant = 'success' | 'warning' | 'alert' | 'neutral' | 'critical'

const STATUS_MAP: Record<Criativo['status'], { label: string; variant: StatusVariant }> = {
  pronto: { label: 'Pronto', variant: 'success' },
  agendado: { label: 'Agendado', variant: 'warning' },
  revisao: { label: 'Em revisão', variant: 'alert' },
  rascunho: { label: 'Rascunho', variant: 'neutral' },
  publicado: { label: 'Publicado', variant: 'neutral' },
}

interface CriativoCardProps {
  criativo: Criativo
  categoria?: Categoria
  onDelete: () => void
}

export default function CriativoCard({ criativo, categoria, onDelete }: CriativoCardProps) {
  const navigate = useNavigate()
  const thumb = criativo.slides[0]?.url_imagem
  const { label, variant } = STATUS_MAP[criativo.status]

  return (
    <div className="group bg-white rounded-xl border border-black/[0.06] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div
        className="h-44 relative overflow-hidden cursor-pointer"
        onClick={() => navigate(`/criativos/${criativo.id}`)}
      >
        {thumb ? (
          <img src={thumb} alt={criativo.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
            <span className="text-purple-400 text-label font-medium">Sem imagem</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/criativos/${criativo.id}`) }}
            className="p-2 bg-white rounded-lg shadow-md text-neutral-700 hover:text-purple-700 transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-2 bg-white rounded-lg shadow-md text-neutral-700 hover:text-red-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Slide count pill */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {criativo.slides.length} slides
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        <h3
          className="text-body-md font-semibold text-neutral-900 leading-snug line-clamp-2 cursor-pointer hover:text-purple-700 transition-colors"
          onClick={() => navigate(`/criativos/${criativo.id}`)}
        >
          {criativo.titulo}
        </h3>

        <div className="flex items-center justify-between gap-2">
          {categoria && (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoria.cor }} />
              <span className="text-label text-neutral-500 truncate">{categoria.nome}</span>
            </div>
          )}
          <Badge variant={variant}>{label}</Badge>
        </div>
      </div>
    </div>
  )
}
