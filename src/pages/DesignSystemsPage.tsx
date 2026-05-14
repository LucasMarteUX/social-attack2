import { useState } from 'react'
import { Plus, Pencil, Copy, Trash2, Palette } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import DesignSystemModal from '../components/modals/DesignSystemModal'
import { useDesignSystems } from '../hooks/useDesignSystems'
import type { DesignSystem } from '../data/mock'

export default function DesignSystemsPage() {
  const { designSystems, loading, criar, editar, duplicar, excluir } = useDesignSystems()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<DesignSystem | null>(null)
  const [excluindo, setExcluindo] = useState<DesignSystem | null>(null)

  function handleNovoOuEditar(ds?: DesignSystem) {
    setEditando(ds ?? null)
    setModalOpen(true)
  }

  async function handleSave(dados: Omit<DesignSystem, 'id' | 'created_at' | 'updated_at'>) {
    if (editando) await editar(editando.id, dados)
    else await criar(dados)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-xl font-bold text-neutral-900">Design Systems</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            {designSystems.length} {designSystems.length === 1 ? 'sistema' : 'sistemas'} cadastrados
          </p>
        </div>
        <Button onClick={() => handleNovoOuEditar()}>
          <Plus size={16} />
          Novo design system
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : designSystems.length === 0 ? (
        <EmptyState onNew={() => handleNovoOuEditar()} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {designSystems.map((ds) => (
            <DesignSystemCard
              key={ds.id}
              ds={ds}
              onEdit={() => handleNovoOuEditar(ds)}
              onDuplicate={() => duplicar(ds.id)}
              onDelete={() => setExcluindo(ds)}
            />
          ))}
        </div>
      )}

      <DesignSystemModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        onSave={handleSave}
        inicial={editando}
      />

      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir design system">
        <p className="text-body-md text-neutral-600 mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-neutral-900">"{excluindo?.name}"</strong>?
          Carrosséis que usam este design system não serão afetados.
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

interface CardProps {
  ds: DesignSystem
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function DesignSystemCard({ ds, onEdit, onDuplicate, onDelete }: CardProps) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Prévia visual com as cores do design system */}
      <div
        className="h-32 flex items-center justify-center gap-2 px-4"
        style={{ backgroundColor: ds.global_background_color }}
      >
        {(['Capa', 'Corpo', 'CTA'] as const).map((label, i) => (
          <div
            key={label}
            className="flex-1 rounded-lg flex flex-col items-center justify-center gap-1 p-2"
            style={{
              aspectRatio: '4/5',
              maxWidth: '64px',
              backgroundColor: i === 2 ? ds.cta_background_color : ds.global_background_color,
              border: `1.5px solid ${ds.global_accent_color}`,
            }}
          >
            <div className="w-5 h-1 rounded-full" style={{ backgroundColor: ds.global_accent_color }} />
            <div className="w-full h-1.5 rounded" style={{ backgroundColor: i === 2 ? ds.cta_text_color : ds.cover_tag_color, opacity: 0.8 }} />
            <div className="w-3/4 h-1 rounded" style={{ backgroundColor: i === 2 ? ds.cta_text_color : ds.body_paragraph_color, opacity: 0.5 }} />
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-body-md font-semibold text-neutral-900 leading-snug">{ds.name}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-700 hover:bg-purple-50 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={onDuplicate} className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-700 hover:bg-purple-50 transition-colors">
              <Copy size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {ds.description && (
          <p className="text-body-sm text-neutral-500 line-clamp-2">{ds.description}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: ds.global_accent_color }} />
          <span className="text-[11px] text-neutral-400 font-mono">{ds.global_accent_color}</span>
          <span className="text-[11px] text-neutral-300">·</span>
          <span className="text-[11px] text-neutral-400">{ds.global_font_family}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
        <Palette size={28} className="text-purple-600" />
      </div>
      <h3 className="text-heading-sm font-semibold text-neutral-900 mb-2">Nenhum design system ainda</h3>
      <p className="text-body-md text-neutral-500 mb-6 max-w-xs">
        Crie um design system para definir tipografia, cores e estrutura dos seus carrosséis.
      </p>
      <Button onClick={onNew}>
        <Plus size={16} />
        Criar design system
      </Button>
    </div>
  )
}
