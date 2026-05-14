import { Heart, Palette, Pencil, Trash2, Link, FileText } from 'lucide-react'
import Badge from '../ui/Badge'
import { type Ideia } from '../../data/mock'

interface IdeaCardProps {
  ideia: Ideia
  corCategoria: string
  onToggleFavorita: () => void
  onEdit: () => void
  onDelete: () => void
  onCriarCarrossel: () => void
}

export default function IdeaCard({
  ideia,
  corCategoria,
  onToggleFavorita,
  onEdit,
  onDelete,
  onCriarCarrossel,
}: IdeaCardProps) {
  return (
    <div className="group bg-surface rounded-xl border border-line/[0.08] shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="p-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-body-lg font-semibold text-ink leading-snug flex-1">
            {ideia.titulo}
          </h3>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggleFavorita}
              className={`p-1.5 rounded-md transition-colors ${
                ideia.favorita
                  ? 'text-ink bg-accent/[0.12]'
                  : 'text-ink-faint hover:text-ink hover:bg-line/[0.06]'
              }`}
            >
              <Heart size={15} fill={ideia.favorita ? 'currentColor' : 'none'} />
            </button>
            <div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onEdit}
                className="p-1.5 rounded-md text-ink-faint hover:text-ink-muted hover:bg-line/[0.06] transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-md text-ink-faint hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Descrição */}
        {ideia.descricao && (
          <p className="text-body-sm text-ink-muted leading-relaxed mb-3 line-clamp-2">
            {ideia.descricao}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {ideia.favorita && <Badge variant="alert">Favorita</Badge>}
          {ideia.conteudo_gerado ? (
            <Badge variant="success">Conteúdo gerado</Badge>
          ) : (
            <Badge variant="neutral">Sem conteúdo</Badge>
          )}
        </div>

        {/* Referências */}
        {ideia.referencias.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {ideia.referencias.slice(0, 2).map((ref, i) => (
              <div key={i} className="flex items-center gap-1.5 text-label text-ink-faint">
                {ref.tipo === 'url' ? (
                  <Link size={11} className="flex-shrink-0" />
                ) : (
                  <FileText size={11} className="flex-shrink-0" />
                )}
                <span className="truncate">{ref.valor}</span>
              </div>
            ))}
            {ideia.referencias.length > 2 && (
              <span className="text-label text-ink-faint">
                +{ideia.referencias.length - 2} referência(s)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer — ação principal */}
      <div className="px-5 py-3 border-t border-line/[0.08]">
        <button
          onClick={onCriarCarrossel}
          className="flex items-center gap-2 text-label font-semibold transition-colors hover:opacity-80"
          style={{ color: corCategoria }}
        >
          <Palette size={14} />
          Criar carrossel
        </button>
      </div>
    </div>
  )
}
