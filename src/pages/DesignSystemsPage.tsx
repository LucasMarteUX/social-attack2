import { useState } from 'react'
import { Plus, Pencil, Copy, Trash2, Palette, FileText } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import DesignSystemModal from '../components/modals/DesignSystemModal'
import { useDesignSystems } from '../hooks/useDesignSystems'
import { supabase } from '../lib/supabase'
import type { DesignSystem } from '../data/mock'

async function uploadReferenciasDesignSystem(dsId: string, files: File[]): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const path = `${dsId}/${crypto.randomUUID()}.${ext}`
    const { data, error } = await supabase.storage.from('design-system-references').upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })
    if (error) throw new Error(error.message)
    const { data: pub } = supabase.storage.from('design-system-references').getPublicUrl(data.path)
    urls.push(pub.publicUrl)
  }
  return urls
}

export default function DesignSystemsPage() {
  const { designSystems, loading, criar, editar, duplicar, excluir } = useDesignSystems()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<DesignSystem | null>(null)
  const [excluindo, setExcluindo] = useState<DesignSystem | null>(null)

  function handleNovoOuEditar(ds?: DesignSystem) {
    setEditando(ds ?? null)
    setModalOpen(true)
  }

  async function handleSave(
    dados: Omit<DesignSystem, 'id' | 'created_at' | 'updated_at'>,
    options?: { novosArquivosReferencia?: File[] }
  ) {
    const novosArquivos = options?.novosArquivosReferencia ?? []
    if (editando) {
      let urls = [...dados.reference_image_urls]
      if (novosArquivos.length) {
        const uploaded = await uploadReferenciasDesignSystem(editando.id, novosArquivos)
        urls = [...urls, ...uploaded]
      }
      await editar(editando.id, { ...dados, reference_image_urls: urls })
      return
    }
    const created = await criar({ ...dados, reference_image_urls: dados.reference_image_urls ?? [] })
    if (novosArquivos.length) {
      const uploaded = await uploadReferenciasDesignSystem(created.id, novosArquivos)
      await editar(created.id, { reference_image_urls: [...(dados.reference_image_urls ?? []), ...uploaded] })
    }
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
  const preview = ds.markdown
    ? ds.markdown.split('\n').slice(0, 4).join('\n')
    : 'Sem documentação ainda.'

  return (
    <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Preview do markdown */}
      <div className="h-28 bg-neutral-50 border-b border-neutral-100 px-4 py-3 overflow-hidden">
        <pre className="text-[10px] text-neutral-400 font-mono leading-relaxed whitespace-pre-wrap line-clamp-5">
          {preview}
        </pre>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-purple-500 flex-shrink-0" />
            <h3 className="text-body-md font-semibold text-neutral-900 leading-snug truncate">{ds.name}</h3>
          </div>
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
        <p className="text-[11px] text-neutral-400">
          {ds.markdown ? `${ds.markdown.split('\n').filter(Boolean).length} linhas de documentação` : 'Sem conteúdo'}
        </p>
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
        Crie um design system e documente em markdown as cores, tipografia e regras de layout dos seus carrosséis.
      </p>
      <Button onClick={onNew}>
        <Plus size={16} />
        Criar design system
      </Button>
    </div>
  )
}
