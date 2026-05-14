import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Lightbulb, ChevronRight, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import IdeaCard from '../components/ideias/IdeaCard'
import IdeaForm from '../components/ideias/IdeaForm'
import Spinner from '../components/ui/Spinner'
import { useIdeias } from '../hooks/useIdeias'
import { useCategorias } from '../hooks/useCategorias'
import { gerarIdeias } from '../lib/gemini'
import type { Ideia } from '../data/mock'

type Filtro = 'todas' | 'favoritas' | 'com_conteudo' | 'sem_conteudo'

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'favoritas', label: 'Favoritas' },
  { key: 'com_conteudo', label: 'Com conteúdo' },
  { key: 'sem_conteudo', label: 'Sem conteúdo' },
]

export default function BibliotecaPage() {
  const { id: categoriaId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { categorias } = useCategorias()
  const categoria = categorias.find((c) => c.id === categoriaId)
  const { ideias, criar, editar, excluir, toggleFavorita } = useIdeias(categoriaId!)

  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Ideia | null>(null)
  const [excluindo, setExcluindo] = useState<Ideia | null>(null)
  const [gerandoIA, setGerandoIA] = useState(false)

  const ideasFiltradas = useMemo(() => {
    switch (filtro) {
      case 'favoritas': return ideias.filter((i) => i.favorita)
      case 'com_conteudo': return ideias.filter((i) => i.conteudo_gerado)
      case 'sem_conteudo': return ideias.filter((i) => !i.conteudo_gerado)
      default: return ideias
    }
  }, [ideias, filtro])

  function handleSave(dados: Pick<Ideia, 'titulo' | 'descricao' | 'referencias'>) {
    if (editando) {
      editar(editando.id, dados)
      setEditando(null)
    } else {
      criar(dados)
    }
  }

  function handleOpenEdit(ideia: Ideia) {
    setEditando(ideia)
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
    setEditando(null)
  }

  async function handleGerarComIA() {
    if (!categoria) return
    setGerandoIA(true)
    try {
      const sugestoes = await gerarIdeias(categoria.nome, categoria.descricao, '', 5)
      await Promise.all(
        sugestoes.map((s) => criar({ titulo: s.titulo, descricao: s.descricao, referencias: [] }))
      )
    } catch {
      // silencia erro — ideias não chegaram
    } finally {
      setGerandoIA(false)
    }
  }

  if (!categoria) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-body-md text-ink-muted">Categoria não encontrada.</p>
        <Link to="/categorias" className="mt-4 text-ink text-body-md font-medium hover:underline">
          Voltar para Categorias
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-label text-ink-faint mb-6">
        <Link to="/categorias" className="hover:text-ink transition-colors">Categorias</Link>
        <ChevronRight size={14} />
        <span className="font-medium" style={{ color: categoria.cor }}>{categoria.nome}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoria.cor }} />
            <h1 className="text-heading-xl font-bold text-ink">Biblioteca de Ideias</h1>
          </div>
          <p className="text-body-md text-ink-muted">
            {ideias.length} {ideias.length === 1 ? 'ideia' : 'ideias'} em {categoria.nome}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleGerarComIA} loading={gerandoIA}>
            {!gerandoIA && <Sparkles size={15} />}
            Gerar com IA
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            Nova ideia
          </Button>
        </div>
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

      {/* Loading IA */}
      {gerandoIA && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/[0.08] border border-line/[0.1] mb-6">
          <Spinner size="sm" />
          <p className="text-body-md text-ink font-medium">Gemini está gerando ideias para você…</p>
        </div>
      )}

      {/* Lista de ideias */}
      {ideasFiltradas.length === 0 ? (
        <EmptyState filtro={filtro} onNew={() => setFormOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideasFiltradas.map((ideia) => (
            <IdeaCard
              key={ideia.id}
              ideia={ideia}
              corCategoria={categoria.cor}
              onToggleFavorita={() => toggleFavorita(ideia.id)}
              onEdit={() => handleOpenEdit(ideia)}
              onDelete={() => setExcluindo(ideia)}
              onCriarCarrossel={() => navigate(`/criativos/novo?ideia=${ideia.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal criar / editar */}
      <IdeaForm
        open={formOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        inicial={editando}
      />

      {/* Modal confirmar exclusão */}
      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir ideia">
        <p className="text-body-md text-ink-muted mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-ink">"{excluindo?.titulo}"</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => { if (excluindo) excluir(excluindo.id); setExcluindo(null) }}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function EmptyState({ filtro, onNew }: { filtro: Filtro; onNew: () => void }) {
  const msg = filtro === 'todas'
    ? 'Nenhuma ideia ainda. Crie manualmente ou gere com IA.'
    : 'Nenhuma ideia encontrada com esse filtro.'

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent/[0.08] flex items-center justify-center mb-4">
        <Lightbulb size={24} className="text-ink-muted" />
      </div>
      <p className="text-body-md text-ink-muted mb-5 max-w-xs">{msg}</p>
      {filtro === 'todas' && (
        <Button onClick={onNew}>
          <Plus size={16} /> Nova ideia
        </Button>
      )}
    </div>
  )
}
