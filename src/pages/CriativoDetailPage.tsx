import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronRight, Copy, Trash2, Calendar, Hash, Instagram } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SlidePreview from '../components/criativos/SlidePreview'
import SlideCarousel from '../components/criativos/SlideCarousel'
import { useCriativos } from '../hooks/useCriativos'

type StatusVariant = 'success' | 'warning' | 'alert' | 'neutral' | 'critical'

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  pronto: { label: 'Pronto', variant: 'success' },
  agendado: { label: 'Agendado', variant: 'warning' },
  revisao: { label: 'Em revisão', variant: 'alert' },
  rascunho: { label: 'Rascunho', variant: 'neutral' },
  publicado: { label: 'Publicado', variant: 'neutral' },
}

export default function CriativoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { criativos, excluir, getCategoria } = useCriativos()

  const [excluindo, setExcluindo] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [slideAtivo, setSlideAtivo] = useState(0)

  const criativo = criativos.find((c) => c.id === id)

  if (!criativo) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-body-md text-neutral-500">Criativo não encontrado.</p>
        <Link to="/criativos" className="mt-4 text-purple-700 text-body-md font-medium hover:underline">
          Voltar para Criativos
        </Link>
      </div>
    )
  }

  const categoria = getCategoria(criativo.categoria_id)
  const statusInfo = STATUS_MAP[criativo.status] ?? { label: criativo.status, variant: 'neutral' as StatusVariant }
  const corCategoria = categoria?.cor ?? '#6D28D9'

  async function handleCopiarLegenda() {
    if (!criativo) return
    await navigator.clipboard.writeText(`${criativo.legenda}\n\n${criativo.hashtags.join(' ')}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function handleExcluir() {
    excluir(criativo!.id)
    navigate('/criativos')
  }

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-label text-neutral-400 mb-6">
        <Link to="/criativos" className="hover:text-purple-700 transition-colors">Criativos</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-neutral-600 truncate max-w-[200px]">{criativo.titulo}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {categoria && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoria.cor }} />
                <span className="text-label text-neutral-500">{categoria.nome}</span>
              </div>
            )}
            <span className="text-label text-neutral-300">·</span>
            <div className="flex items-center gap-1 text-label text-neutral-400">
              <Instagram size={12} />
              {criativo.slides.length} slides
            </div>
          </div>
          <h1 className="text-heading-xl font-bold text-neutral-900">{criativo.titulo}</h1>
          <p className="text-label text-neutral-400 mt-1">
            Atualizado em {new Date(criativo.atualizado_em).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={() => navigate('/agenda')}>
            <Calendar size={15} />
            Agendar
          </Button>
          <Button variant="ghost" onClick={() => setExcluindo(true)}>
            <Trash2 size={15} className="text-red-500" />
          </Button>
        </div>
      </div>

      {/* Layout principal: carrossel + legenda */}
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start mb-10">
        {/* Carrossel */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-label font-semibold text-neutral-500 uppercase tracking-wide">
              Preview do post
            </p>
            <span className="text-[11px] font-medium text-neutral-400">Arraste →</span>
          </div>

          <SlideCarousel
            current={slideAtivo}
            onChange={setSlideAtivo}
            slides={criativo.slides.map((s) => (
              <SlidePreview
                key={s.numero}
                numero={s.numero}
                texto={s.texto}
                total={criativo.slides.length}
                corCategoria={corCategoria}
                categoriaNome={categoria?.nome}
                urlImagem={s.url_imagem}
              />
            ))}
          />
        </div>

        {/* Legenda e hashtags */}
        <div className="flex flex-col gap-4">
          <div className="p-6 rounded-2xl bg-white border border-neutral-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-body-lg font-semibold text-neutral-900">Legenda</h2>
              <Button variant="ghost" size="sm" onClick={handleCopiarLegenda}>
                <Copy size={14} />
                {copiado ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className="text-body-md text-neutral-700 whitespace-pre-line leading-relaxed">
              {criativo.legenda}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-100 shadow-sm">
            <h2 className="text-body-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Hash size={16} className="text-purple-600" />
              Hashtags
            </h2>
            <div className="flex flex-wrap gap-2">
              {criativo.hashtags.map((h) => (
                <span
                  key={h}
                  className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-label font-medium"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Slide ativo info */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide mb-1">
              Slide {slideAtivo + 1} de {criativo.slides.length}
            </p>
            <p className="text-body-sm text-neutral-700 leading-relaxed whitespace-pre-line">
              {criativo.slides[slideAtivo]?.texto}
            </p>
          </div>
        </div>
      </div>

      {/* Modal excluir */}
      <Modal open={excluindo} onClose={() => setExcluindo(false)} title="Excluir criativo">
        <p className="text-body-md text-neutral-600 mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-neutral-900">"{criativo.titulo}"</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setExcluindo(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleExcluir}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
