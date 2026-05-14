import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ExternalLink, Copy, Trash2, Pencil, Workflow, Clock, CalendarPlus } from 'lucide-react'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import { useCarousels } from '../hooks/useCarousels'
import { useAgenda } from '../hooks/useAgenda'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import type { Carousel } from '../data/mock'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  generating: 'Gerando...',
  ready: 'Pronto',
  published: 'Publicado',
}
const STATUS_VARIANTS: Record<string, 'neutral' | 'alert' | 'success'> = {
  draft: 'neutral',
  generating: 'alert',
  ready: 'success',
  published: 'neutral',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { carousels, loading, excluir, editar, recarregar } = useCarousels()
  const { criar: criarAgendamento } = useAgenda()
  const toast = useToast()

  const [editando, setEditando] = useState<Carousel | null>(null)
  const [tituloEdit, setTituloEdit] = useState('')
  const [excluindo, setExcluindo] = useState<Carousel | null>(null)
  const [duplicandoId, setDuplicandoId] = useState<string | null>(null)
  const [agendando, setAgendando] = useState<Carousel | null>(null)
  const [agData, setAgData] = useState('')
  const [agHora, setAgHora] = useState('09:00')
  const [agPlataforma, setAgPlataforma] = useState<'instagram' | 'linkedin' | 'twitter'>('instagram')
  const [agNotas, setAgNotas] = useState('')
  const [agSalvando, setAgSalvando] = useState(false)

  async function handleAgendar() {
    if (!agendando || !agData) return
    setAgSalvando(true)
    try {
      const dataPublicacao = new Date(`${agData}T${agHora}:00`).toISOString()
      await criarAgendamento({
        criativo_id: null,
        carousel_id: agendando.id,
        data_publicacao: dataPublicacao,
        plataforma: agPlataforma,
        status: 'agendado',
        notas: agNotas.trim(),
      })
      setAgendando(null)
      setAgData('')
      setAgHora('09:00')
      setAgPlataforma('instagram')
      setAgNotas('')
      toast.success('Workflow agendado com sucesso!')
      navigate('/agenda')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao agendar. Tente novamente.')
    } finally {
      setAgSalvando(false)
    }
  }

  async function duplicarWorkspace(carousel: Carousel) {
    setDuplicandoId(carousel.id)
    try {
      // Cria cópia do carrossel
      const { id: _, created_at: __, updated_at: ___, ...campos } = carousel
      const { data: novoCar, error } = await supabase
        .from('carousels')
        .insert({
          ...campos,
          title: `${campos.title} (cópia)`,
          status: 'draft',
          version: (campos.version ?? 1) + 1,
          parent_carousel_id: carousel.id,
        })
        .select()
        .single()
      if (error || !novoCar) throw new Error(error?.message ?? 'Erro ao duplicar')

      // Copia os slides
      const { data: slides } = await supabase
        .from('carousel_slides')
        .select('*')
        .eq('carousel_id', carousel.id)
        .order('slide_number')

      if (slides?.length) {
        const copias = slides.map(({ id: _sid, carousel_id: _cid, created_at: _ca, updated_at: _ua, ...rest }) => ({
          ...rest,
          carousel_id: novoCar.id,
        }))
        await supabase.from('carousel_slides').insert(copias)
      }

      recarregar()
      toast.success('Workspace duplicado com sucesso!')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao duplicar workspace.')
    } finally {
      setDuplicandoId(null)
    }
  }

  async function handleSalvarEdicao() {
    if (!editando || !tituloEdit.trim()) return
    await editar(editando.id, { title: tituloEdit.trim() })
    setEditando(null)
    toast.success('Título atualizado.')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-xl font-bold text-neutral-900">Workspaces</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            {loading ? '…' : `${carousels.length} ${carousels.length === 1 ? 'workspace' : 'workspaces'} criados`}
          </p>
        </div>
        <Button onClick={() => navigate('/workspace/novo')}>
          <Plus size={16} />
          Novo workspace
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : carousels.length === 0 ? (
        <EmptyState onCreate={() => navigate('/workspace/novo')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {carousels.map((c) => (
            <WorkspaceCard
              key={c.id}
              carousel={c}
              duplicating={duplicandoId === c.id}
              onOpen={() => navigate(`/workspace/${c.id}`)}
              onEdit={() => { setEditando(c); setTituloEdit(c.title) }}
              onDuplicate={() => duplicarWorkspace(c)}
              onDelete={() => setExcluindo(c)}
              onAgendar={() => { setAgendando(c); setAgData('') }}
            />
          ))}
        </div>
      )}

      {/* Modal editar */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar workspace">
        <div className="flex flex-col gap-4">
          <Input
            label="Título"
            value={tituloEdit}
            onChange={(e) => setTituloEdit(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSalvarEdicao()}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal agendar */}
      <Modal open={!!agendando} onClose={() => setAgendando(null)} title="Enviar para a Agenda">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-neutral-500">
            Agendando: <strong className="text-neutral-800">{agendando?.title}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Data *</label>
              <input
                type="date"
                value={agData}
                onChange={(e) => setAgData(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Horário</label>
              <input
                type="time"
                value={agHora}
                onChange={(e) => setAgHora(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Plataforma</label>
            <select
              value={agPlataforma}
              onChange={(e) => setAgPlataforma(e.target.value as typeof agPlataforma)}
              className="px-3 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all bg-white"
            >
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter / X</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Notas (opcional)</label>
            <textarea
              value={agNotas}
              onChange={(e) => setAgNotas(e.target.value)}
              rows={2}
              placeholder="Observações sobre a postagem..."
              className="px-3 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setAgendando(null)}>Cancelar</Button>
            <Button onClick={handleAgendar} disabled={!agData || agSalvando}>
              {agSalvando ? 'Agendando…' : 'Agendar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal excluir */}
      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir workspace">
        <p className="text-body-md text-neutral-600 mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-neutral-900">"{excluindo?.title}"</strong>?
          Todos os slides serão removidos permanentemente.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => { if (excluindo) { excluir(excluindo.id); toast.info('Workspace excluído.') } setExcluindo(null) }}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}

interface CardProps {
  carousel: Carousel
  duplicating: boolean
  onOpen: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onAgendar: () => void
}

function WorkspaceCard({ carousel, duplicating, onOpen, onEdit, onDuplicate, onDelete, onAgendar }: CardProps) {
  const styles = carousel.styles

  return (
    <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm hover:shadow-md transition-all overflow-hidden group">

      {/* Preview de cores do design system */}
      <div
        className="h-28 flex items-center justify-center gap-3 px-6 cursor-pointer"
        style={{ backgroundColor: styles?.backgroundColor ?? '#F5F3FF' }}
        onClick={onOpen}
      >
        {(['Capa', 'Corpo', 'CTA'] as const).map((label, i) => (
          <div
            key={label}
            className="rounded-lg flex flex-col items-center justify-center gap-1.5 p-2 flex-1"
            style={{
              maxWidth: 64,
              aspectRatio: '4/5',
              backgroundColor: i === 2
                ? (styles?.ctaBackgroundColor ?? '#6D28D9')
                : (styles?.backgroundColor ?? '#FFFFFF'),
              border: `1.5px solid ${styles?.primaryColor ?? '#6D28D9'}`,
            }}
          >
            <div className="w-5 h-1 rounded-full" style={{ backgroundColor: styles?.primaryColor ?? '#6D28D9' }} />
            <div className="w-full h-1.5 rounded" style={{
              backgroundColor: i === 2
                ? (styles?.ctaTextColor ?? '#FFFFFF')
                : (styles?.textColor ?? '#1A1A1A'),
              opacity: 0.6,
            }} />
            <div className="w-3/4 h-1 rounded" style={{
              backgroundColor: i === 2
                ? (styles?.ctaTextColor ?? '#FFFFFF')
                : (styles?.textColor ?? '#1A1A1A'),
              opacity: 0.35,
            }} />
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className="text-body-md font-semibold text-neutral-900 leading-snug cursor-pointer hover:text-purple-700 transition-colors line-clamp-2"
            onClick={onOpen}
          >
            {carousel.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-700 hover:bg-purple-50 transition-colors" title="Editar">
              <Pencil size={14} />
            </button>
            <button onClick={onDuplicate} disabled={duplicating} className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50" title="Duplicar">
              {duplicating ? <Spinner size="sm" /> : <Copy size={14} />}
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANTS[carousel.status] ?? 'default'}>
            {STATUS_LABELS[carousel.status] ?? carousel.status}
          </Badge>
          <span className="text-[11px] text-neutral-400">{carousel.total_slides} slides</span>
          <span className="text-[11px] text-neutral-300">·</span>
          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
            <Clock size={10} />
            {formatDate(carousel.created_at)}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onOpen}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-purple-100 text-[12px] font-medium text-purple-700 hover:bg-purple-50 transition-colors"
          >
            <ExternalLink size={12} />
            Abrir
          </button>
          <button
            onClick={onAgendar}
            title="Enviar para a Agenda"
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-600 hover:border-purple-200 hover:text-purple-700 hover:bg-purple-50 transition-colors"
          >
            <CalendarPlus size={12} />
            Agendar
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
        <Workflow size={28} className="text-purple-600" />
      </div>
      <h3 className="text-heading-sm font-semibold text-neutral-900 mb-2">Nenhum workspace ainda</h3>
      <p className="text-body-md text-neutral-500 mb-6 max-w-xs">
        Crie um workspace para gerar carrosséis com IA, aplicar design systems e editar os slides no canvas.
      </p>
      <Button onClick={onCreate}>
        <Plus size={16} />
        Criar primeiro workspace
      </Button>
    </div>
  )
}
