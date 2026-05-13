import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CategoryCard from '../components/categorias/CategoryCard'
import CategoryForm from '../components/categorias/CategoryForm'
import { useCategorias } from '../hooks/useCategorias'
import { type Categoria } from '../data/mock'

export default function CategoriasPage() {
  const navigate = useNavigate()
  const { categorias, getStats, criar, editar, excluir } = useCategorias()

  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [excluindo, setExcluindo] = useState<Categoria | null>(null)

  function handleSave(dados: Omit<Categoria, 'id' | 'criado_em'>) {
    if (editando) {
      editar(editando.id, dados)
      setEditando(null)
    } else {
      criar(dados)
    }
  }

  function handleOpenEdit(cat: Categoria) {
    setEditando(cat)
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
    setEditando(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-heading-xl font-bold text-neutral-900">Categorias</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            Organize seus conteúdos por temas
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={16} />
          Nova categoria
        </Button>
      </div>

      {/* Grid de categorias */}
      {categorias.length === 0 ? (
        <EmptyState onNew={() => setFormOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((cat) => {
            const { ideias, criativos } = getStats(cat.id)
            return (
              <CategoryCard
                key={cat.id}
                categoria={cat}
                ideias={ideias}
                criativos={criativos}
                onClick={() => navigate(`/categorias/${cat.id}/ideias`)}
                onEdit={() => handleOpenEdit(cat)}
                onDelete={() => setExcluindo(cat)}
              />
            )
          })}
        </div>
      )}

      {/* Modal criar / editar */}
      <CategoryForm
        open={formOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        inicial={editando}
      />

      {/* Modal confirmar exclusão */}
      <Modal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        title="Excluir categoria"
      >
        <p className="text-body-md text-neutral-600 mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-neutral-900">"{excluindo?.nome}"</strong>?
          <br />
          <span className="text-label text-neutral-400 mt-1 block">
            As ideias e criativos vinculados não serão removidos.
          </span>
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (excluindo) excluir(excluindo.id)
              setExcluindo(null)
            }}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
        <FolderOpen size={28} className="text-purple-600" />
      </div>
      <h3 className="text-heading-sm font-semibold text-neutral-900 mb-2">
        Nenhuma categoria ainda
      </h3>
      <p className="text-body-md text-neutral-500 mb-6 max-w-xs">
        Crie sua primeira categoria para começar a organizar suas ideias e conteúdos.
      </p>
      <Button onClick={onNew}>
        <Plus size={16} />
        Criar primeira categoria
      </Button>
    </div>
  )
}
