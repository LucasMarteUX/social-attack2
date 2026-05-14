import { useState, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import { RotateCcw, Wand2, Upload, Trash2, ChevronLeft, ChevronRight, Image, Download } from 'lucide-react'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'
import type { CarouselSlide, SlideStyles } from '../../data/mock'
import { DEFAULT_SLIDE_STYLES as DSS, PLACEHOLDER_TEXTO_SLIDE_GERANDO } from '../../data/mock'

export interface SlidePendingVariantPreview {
  id: string
  url: string
  prompt: string
}

export interface SlideNodeData {
  slide: CarouselSlide
  styles: SlideStyles | null
  totalSlides: number
  imageGenerating?: boolean
  /** Miniaturas geradas pelo fluxo “variação de fundo” — ainda não substituem image_url */
  pendingImageVariants?: SlidePendingVariantPreview[]
  onEditarTexto: (slideId: string, campo: string, valor: string) => Promise<void>
  onResetarTexto: (slideId: string) => Promise<void>
  onAbrirRegenerar: (slideId: string, campo: string, textoAtual: string) => void
  onAbrirGerarImagem: (slideId: string) => void
  onUsarVarianteImagem?: (slideId: string, variant: SlidePendingVariantPreview) => Promise<void>
  onDescartarVarianteImagem?: (slideId: string, variantId: string) => void
  onUploadImagem: (slideId: string, file: File) => Promise<void>
  onRemoverImagem: (slideId: string) => Promise<void>
  onNavegar: (slideNumber: number) => void
}

interface Props {
  data: SlideNodeData
}

const SLIDE_TYPE_LABEL: Record<string, string> = { cover: 'Capa', body: 'Corpo', cta: 'CTA' }

const SCALE = 0.38

function phCls(val: string | null | undefined) {
  return val === PLACEHOLDER_TEXTO_SLIDE_GERANDO ? ' italic text-neutral-400' : ''
}

function px(size: number) {
  return `${Math.max(8, Math.round(size * SCALE))}px`
}

export default function SlideNode({ data }: Props) {
  const {
    slide,
    styles,
    totalSlides,
    imageGenerating,
    pendingImageVariants = [],
    onEditarTexto,
    onResetarTexto,
    onAbrirRegenerar,
    onAbrirGerarImagem,
    onUsarVarianteImagem,
    onDescartarVarianteImagem,
    onUploadImagem,
    onRemoverImagem,
    onNavegar,
  } = data
  const [editandoCampo, setEditandoCampo] = useState<string | null>(null)
  const [valorTemp, setValorTemp] = useState('')
  const [arteImgErro, setArteImgErro] = useState(false)

  useEffect(() => {
    setArteImgErro(false)
  }, [slide.image_url])

  const s = styles ?? DSS
  const isCTA = slide.slide_type === 'cta'
  const slideBg = isCTA ? s.ctaBackgroundColor : s.backgroundColor
  const pad = Math.max(8, Math.round(s.padding * 0.35))
  const arteEhPostCompleto = Boolean(slide.image_url && slide.image_is_full_composition)
  const mostrarTipografiaSobreArte = !arteEhPostCompleto || arteImgErro

  function iniciarEdicao(campo: string, valorAtual: string) {
    setEditandoCampo(campo)
    setValorTemp(valorAtual ?? '')
  }

  async function salvarEdicao() {
    if (!editandoCampo) return
    await onEditarTexto(slide.id, editandoCampo, valorTemp)
    setEditandoCampo(null)
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUploadImagem(slide.id, file)
  }

  const isEdited = slide.is_text_edited || slide.is_image_edited

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-md w-[300px]">
      <Handle type="target" position={Position.Top} className="!bg-neutral-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-400" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: s.primaryColor }}>
            {slide.slide_number}
          </div>
          <span className="text-label font-semibold text-neutral-700">{SLIDE_TYPE_LABEL[slide.slide_type] ?? slide.slide_type}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isEdited && <Badge variant="alert">Editado</Badge>}
          <button onClick={() => onResetarTexto(slide.id)} title="Reset para original" className="p-1 rounded text-neutral-400 hover:text-purple-700 hover:bg-purple-50 transition-colors">
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Preview miniatura 4:5 */}
        <div
          className="w-full rounded-lg overflow-hidden relative group"
          style={{ aspectRatio: '4/5', backgroundColor: slideBg, border: `1.5px solid ${s.primaryColor}20` }}
        >
          {slide.image_url && (
            <img
              src={slide.image_url}
              alt=""
              className="w-full h-full object-cover absolute inset-0"
              onError={() => setArteImgErro(true)}
            />
          )}
          {slide.image_url && !imageGenerating && (
            <button
              type="button"
              title="Baixar imagem"
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const res = await fetch(slide.image_url!)
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `slide-${slide.slide_number}.jpg`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  window.open(slide.image_url!, '_blank')
                }
              }}
              className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-md bg-black/50 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Download size={11} className="text-white" />
            </button>
          )}
          {imageGenerating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <Spinner size="sm" />
            </div>
          )}
          {mostrarTipografiaSobreArte ? (
          <div
            className="absolute inset-0 flex flex-col justify-center gap-1 pointer-events-none"
            style={{
              padding: `${pad}px`,
              textAlign: slide.slide_type === 'body' ? s.bodyTextAlign : s.coverTextAlign,
            }}
          >
            {slide.slide_type === 'cover' && (
              <>
                {slide.tag_text && (
                  <span className={`font-bold uppercase tracking-wider${phCls(slide.tag_text)}`} style={{ fontSize: px(s.coverHeadlineFontSize * 0.375), color: s.tagColor }}>
                    {slide.tag_text}
                  </span>
                )}
                {slide.headline && (
                  <span className={`font-black leading-tight${phCls(slide.headline)}`} style={{ fontSize: px(s.coverHeadlineFontSize), color: s.textColor }}>
                    {slide.headline}
                  </span>
                )}
                {slide.subheadline && (
                  <span className={`leading-snug${phCls(slide.subheadline)}`} style={{ fontSize: px(s.coverSubheadlineFontSize), color: s.textColor, opacity: 0.7 }}>
                    {slide.subheadline}
                  </span>
                )}
              </>
            )}
            {slide.slide_type === 'body' && (
              <>
                {slide.headline && (
                  <span className={`font-bold leading-tight${phCls(slide.headline)}`} style={{ fontSize: px(s.bodyHeadlineFontSize), color: s.textColor }}>
                    {slide.headline}
                  </span>
                )}
                {slide.body_paragraph && (
                  <span className={`leading-relaxed${phCls(slide.body_paragraph)}`} style={{ fontSize: px(s.bodyParagraphFontSize), color: s.textColor, opacity: 0.8 }}>
                    {slide.body_paragraph}
                  </span>
                )}
              </>
            )}
            {slide.slide_type === 'cta' && slide.cta_message && (
              <span className={`font-black text-center leading-tight${phCls(slide.cta_message)}`} style={{ fontSize: px(s.ctaFontSize), color: s.ctaTextColor }}>
                {slide.cta_message}
              </span>
            )}
          </div>
          ) : null}
        </div>

        {/* Campos editáveis */}
        {slide.slide_type === 'cover' && (
          <>
            <CampoTexto label="Tag" campo="tag_text" valor={slide.tag_text} editando={editandoCampo} valorTemp={valorTemp} onIniciar={iniciarEdicao} onSalvar={salvarEdicao} onChange={setValorTemp} onRegenerar={() => onAbrirRegenerar(slide.id, 'tag_text', slide.tag_text ?? '')} />
            <CampoTexto label="Headline" campo="headline" valor={slide.headline} editando={editandoCampo} valorTemp={valorTemp} onIniciar={iniciarEdicao} onSalvar={salvarEdicao} onChange={setValorTemp} onRegenerar={() => onAbrirRegenerar(slide.id, 'headline', slide.headline ?? '')} />
            <CampoTexto label="Subheadline" campo="subheadline" valor={slide.subheadline} editando={editandoCampo} valorTemp={valorTemp} onIniciar={iniciarEdicao} onSalvar={salvarEdicao} onChange={setValorTemp} onRegenerar={() => onAbrirRegenerar(slide.id, 'subheadline', slide.subheadline ?? '')} />
          </>
        )}
        {slide.slide_type === 'body' && (
          <>
            <CampoTexto label="Headline" campo="headline" valor={slide.headline} editando={editandoCampo} valorTemp={valorTemp} onIniciar={iniciarEdicao} onSalvar={salvarEdicao} onChange={setValorTemp} onRegenerar={() => onAbrirRegenerar(slide.id, 'headline', slide.headline ?? '')} />
            <CampoTexto label="Parágrafo" campo="body_paragraph" valor={slide.body_paragraph} editando={editandoCampo} valorTemp={valorTemp} onIniciar={iniciarEdicao} onSalvar={salvarEdicao} onChange={setValorTemp} onRegenerar={() => onAbrirRegenerar(slide.id, 'body_paragraph', slide.body_paragraph ?? '')} multiline />
          </>
        )}
        {slide.slide_type === 'cta' && (
          <CampoTexto label="Mensagem CTA" campo="cta_message" valor={slide.cta_message} editando={editandoCampo} valorTemp={valorTemp} onIniciar={iniciarEdicao} onSalvar={salvarEdicao} onChange={setValorTemp} onRegenerar={() => onAbrirRegenerar(slide.id, 'cta_message', slide.cta_message ?? '')} />
        )}

        {/* Arte */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Arte do slide</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              title="Gera nova opção de fundo — mantém texto e diagramação; escolha na lista em baixo"
              onClick={() => onAbrirGerarImagem(slide.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-purple-200 text-[11px] font-medium text-purple-700 hover:bg-purple-50 transition-colors"
            >
              <Wand2 size={11} /> Var. fundo
            </button>
            <label className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-neutral-200 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer">
              <Upload size={11} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            {slide.image_url && (
              <button onClick={() => onRemoverImagem(slide.id)} className="p-1.5 rounded-md border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={11} />
              </button>
            )}
          </div>
          {slide.image_url && (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Image size={10} />
              <span>
                {slide.image_source === 'generated'
                  ? slide.image_is_full_composition
                    ? 'IA — post completo'
                    : 'Gerada por IA'
                  : 'Upload'}
              </span>
            </div>
          )}
          {pendingImageVariants.length > 0 && (
            <div className="rounded-lg border border-purple-100 bg-purple-50/50 px-2 py-2 mt-1">
              <p className="text-[10px] font-semibold text-purple-900 uppercase tracking-wide">
                Opções de fundo (mesmo layout)
              </p>
              <p className="text-[10px] text-purple-800/90 leading-snug mt-0.5 mb-1.5">
                Nova arte só atrás do texto. Clique em <strong>Usar</strong> para tornar ativa ou ✕ para descartar.
                A imagem atual do preview principal não é removida até você usar uma opção.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {pendingImageVariants.map((v) => (
                  <div key={v.id} className="flex flex-col gap-1 shrink-0 w-[76px]">
                    <div className="relative rounded-md border border-purple-200 overflow-hidden aspect-[4/5] bg-white shadow-sm">
                      <img src={v.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => void onUsarVarianteImagem?.(slide.id, v)}
                        className="flex-1 py-0.5 rounded text-[9px] font-semibold bg-purple-700 text-white hover:bg-purple-800 transition-colors"
                      >
                        Usar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDescartarVarianteImagem?.(slide.id, v.id)}
                        className="px-1.5 py-0.5 rounded text-[9px] font-medium border border-neutral-200 bg-white text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                        aria-label="Descartar variação"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
          <button onClick={() => onNavegar(slide.slide_number - 1)} disabled={slide.slide_number <= 1} className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] text-neutral-400 font-medium">Slide {slide.slide_number} de {totalSlides}</span>
          <button onClick={() => onNavegar(slide.slide_number + 1)} disabled={slide.slide_number >= totalSlides} className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface CampoTextoProps {
  label: string
  campo: string
  valor: string | null | undefined
  editando: string | null
  valorTemp: string
  multiline?: boolean
  onIniciar: (campo: string, valor: string) => void
  onSalvar: () => void
  onChange: (v: string) => void
  onRegenerar: () => void
}

function CampoTexto({ label, campo, valor, editando, valorTemp, multiline, onIniciar, onSalvar, onChange, onRegenerar }: CampoTextoProps) {
  const ativo = editando === campo
  const valorEhPlaceholder = valor === PLACEHOLDER_TEXTO_SLIDE_GERANDO
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">{label}</span>
        <button onClick={onRegenerar} className="text-[10px] text-purple-500 hover:text-purple-700 flex items-center gap-0.5 transition-colors">
          <Wand2 size={10} /> Regenerar
        </button>
      </div>
      {ativo ? (
        multiline ? (
          <textarea autoFocus value={valorTemp} onChange={(e) => onChange(e.target.value)} onBlur={onSalvar} rows={3} className="w-full px-2 py-1.5 rounded border border-purple-400 text-[11px] text-neutral-900 outline-none resize-none focus:ring-1 focus:ring-purple-300" />
        ) : (
          <input autoFocus value={valorTemp} onChange={(e) => onChange(e.target.value)} onBlur={onSalvar} onKeyDown={(e) => e.key === 'Enter' && onSalvar()} className="w-full px-2 py-1.5 rounded border border-purple-400 text-[11px] text-neutral-900 outline-none focus:ring-1 focus:ring-purple-300" />
        )
      ) : (
        <p onClick={() => onIniciar(campo, valor ?? '')} className={`text-[11px] leading-relaxed px-2 py-1.5 rounded border border-transparent hover:border-neutral-200 hover:bg-neutral-50 cursor-text transition-colors min-h-[28px] ${valorEhPlaceholder ? 'text-neutral-400 italic' : 'text-neutral-700'}`}>
          {valor || <span className="text-neutral-300 italic">Clique para editar</span>}
        </p>
      )}
    </div>
  )
}
