import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Palette } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CriativoCard from '../components/criativos/CriativoCard'
import { useCriativos } from '../hooks/useCriativos'
import { type Criativo } from '../data/mock'

type Filtro = 'todos' | Criativo['status']

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'rascunho', label: 'Rascunho' },
  { key: 'revisao', label: 'Em revisão' },
  { key: 'pronto', label: 'Pronto' },
  { key: 'agendado', label: 'Agendado' },
  { key: 'publicado', label: 'Publicado' },
]

export default function CriativosPage() {
  const navigate = useNavigate()
  const { criativos, categorias, excluir } = useCriativos()

  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const filtrados = filtro === 'todos' ? criativos : criativos.filter((c) => c.status === filtro)
  const excluindoCriativo = criativos.find((c) => c.id === excluindo)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-xl font-bold text-ink">Criativos</h1>
          <p className="text-body-md text-ink-muted mt-1">
            {criativos.length} {criativos.length === 1 ? 'criativo' : 'criativos'} no total
          </p>
        </div>
        <Button onClick={() => navigate('/criativos/novo')}>
          <Plus size={16} />
          Novo criativo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-4 py-1.5 rounded-full text-label font-medium border transition-colors ${
              filtro === f.key
                ? 'border-accent bg-accent/[0.08] text-ink'
                : 'border-line/[0.12] bg-surface text-ink-muted hover:border-line/[0.14]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <EmptyState filtro={filtro} onNew={() => navigate('/criativos/novo')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((c) => (
            <CriativoCard
              key={c.id}
              criativo={c}
              categoria={categorias.find((cat) => cat.id === c.categoria_id)}
              onDelete={() => setExcluindo(c.id)}
            />
          ))}
        </div>
      )}

      {/* Modal excluir */}
      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir criativo">
        <p className="text-body-md text-ink-muted mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-ink">"{excluindoCriativo?.titulo}"</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => { if (excluindo) excluir(excluindo); setExcluindo(null) }}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function EmptyState({ filtro, onNew }: { filtro: Filtro; onNew: () => void }) {
  const msg = filtro === 'todos'
    ? 'Crie seu primeiro carrossel a partir de uma ideia ou do zero.'
    : 'Nenhum criativo encontrado com esse filtro.'

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/[0.08] flex items-center justify-center mb-4">
        <Palette size={28} className="text-ink-muted" />
      </div>
      <h3 className="text-heading-sm font-semibold text-ink mb-2">
        {filtro === 'todos' ? 'Nenhum criativo ainda' : 'Sem resultados'}
      </h3>
      <p className="text-body-md text-ink-muted mb-6 max-w-xs">{msg}</p>
      {filtro === 'todos' && (
        <Button onClick={onNew}>
          <Plus size={16} />
          Novo criativo
        </Button>
      )}
    </div>
  )
}
