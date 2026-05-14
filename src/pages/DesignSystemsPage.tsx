import { useState } from 'react'
import { Plus, Pencil, Copy, Trash2, Palette, FileText, ImageIcon } from 'lucide-react'
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
    const ext = extensaoUpload(file)
    const path = `${dsId}/${novoIdArquivo()}.${ext}`
    const { data, error } = await supabase.storage.from('design-system-references').upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg',
    })
    if (error) throw new Error(`Upload: ${error.message}`)
    if (!data?.path) throw new Error('Upload concluído sem caminho do arquivo.')
    const { data: pub } = supabase.storage.from('design-system-references').getPublicUrl(data.path)
    urls.push(pub.publicUrl)
  }
  return urls
}

function extensaoUpload(file: File): string {
  const mime = (file.type ?? '').toLowerCase()
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('heic')) return 'heic'
  if (mime.includes('heif')) return 'heif'
  if (mime.includes('jpeg') || mime === 'image/jpg') return 'jpg'
  const part = file.name.includes('.') ? file.name.split('.').pop() ?? '' : ''
  const safe = part.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (safe.length > 0 && safe.length <= 5) return safe
  return 'jpg'
}

function novoIdArquivo(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export default function DesignSystemsPage() {
  const { designSystems, loading, criar, editar, duplicar, excluir } = useDesignSystems()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<DesignSystem | null>(null)
  const [excluindo, setExcluindo] = useState<DesignSystem | null>(null)

  function handleNovoOuEditar(ds?: DesignSystem) {
    if (ds) {
      const sync = designSystems.find((x) => x.id === ds.id)
      setEditando(sync ?? ds)
    } else {
      setEditando(null)
    }
    setModalOpen(true)
  }

  async function anexarReferenciasAoEditando(files: File[]): Promise<string[]> {
    if (!editando) throw new Error('Design system não encontrado.')
    const uploaded = await uploadReferenciasDesignSystem(editando.id, files)
    const merged = [...(editando.reference_image_urls ?? []), ...uploaded]
    const atualizado = await editar(editando.id, { reference_image_urls: merged })
    setEditando(atualizado)
    return uploaded
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
          <h1 className="text-heading-xl font-bold text-ink">Design Systems</h1>
          <p className="text-body-md text-ink-muted mt-1">
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
        onAnexarReferencias={editando ? anexarReferenciasAoEditando : undefined}
      />

      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir design system">
        <p className="text-body-md text-ink-muted mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-ink">"{excluindo?.name}"</strong>?
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
    <div className="bg-surface rounded-xl border border-line/[0.08] shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Preview do markdown */}
      <div className="h-28 bg-line/[0.04] border-b border-line/[0.08] px-4 py-3 overflow-hidden">
        <pre className="text-[10px] text-ink-faint font-mono leading-relaxed whitespace-pre-wrap line-clamp-5">
          {preview}
        </pre>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-ink-muted flex-shrink-0" />
            <h3 className="text-body-md font-semibold text-ink leading-snug truncate">{ds.name}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-accent/[0.08] transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={onDuplicate} className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-accent/[0.08] transition-colors">
              <Copy size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-ink-faint hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-ink-faint">
          {ds.markdown ? `${ds.markdown.split('\n').filter(Boolean).length} linhas de documentação` : 'Sem conteúdo'}
        </p>
        {(ds.reference_image_urls?.length ?? 0) > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <ImageIcon size={12} className="text-ink-faint flex-shrink-0" />
            <div className="flex gap-1 overflow-hidden">
              {ds.reference_image_urls.slice(0, 5).map((url) => (
                <img key={url} src={url} alt="" className="w-9 h-9 rounded-md object-cover border border-line/[0.08] flex-shrink-0" />
              ))}
            </div>
            <span className="text-[10px] text-ink-faint whitespace-nowrap">{ds.reference_image_urls.length} ref.</span>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/[0.08] flex items-center justify-center mb-4">
        <Palette size={28} className="text-ink-muted" />
      </div>
      <h3 className="text-heading-sm font-semibold text-ink mb-2">Nenhum design system ainda</h3>
      <p className="text-body-md text-ink-muted mb-6 max-w-xs">
        Crie um design system e documente em markdown as cores, tipografia e regras de layout dos seus carrosséis.
      </p>
      <Button onClick={onNew}>
        <Plus size={16} />
        Criar design system
      </Button>
    </div>
  )
}
