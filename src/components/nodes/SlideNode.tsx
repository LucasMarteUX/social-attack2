import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { RotateCcw, Wand2, Upload, Trash2, ChevronLeft, ChevronRight, Image } from 'lucide-react'
import Badge from '../ui/Badge'
import type { CarouselSlide, DesignSystem } from '../../data/mock'

export interface SlideNodeData {
  slide: CarouselSlide
  designSystem: DesignSystem | null
  totalSlides: number
  onEditarTexto: (slideId: string, campo: string, valor: string) => Promise<void>
  onResetarTexto: (slideId: string) => Promise<void>
  onAbrirRegenerar: (slideId: string, campo: string, textoAtual: string) => void
  onAbrirGerarImagem: (slideId: string) => void
  onUploadImagem: (slideId: string, file: File) => Promise<void>
  onRemoverImagem: (slideId: string) => Promise<void>
  onNavegar: (slideNumber: number) => void
}

interface Props {
  data: SlideNodeData
}

const SLIDE_TYPE_LABEL: Record<string, string> = {
  cover: 'Capa',
  body: 'Corpo',
  cta: 'CTA',
}

export default function SlideNode({ data }: Props) {
  const { slide, designSystem, totalSlides, onEditarTexto, onResetarTexto, onAbrirRegenerar, onAbrirGerarImagem, onUploadImagem, onRemoverImagem, onNavegar } = data
  const [editandoCampo, setEditandoCampo] = useState<string | null>(null)
  const [valorTemp, setValorTemp] = useState('')

  const bg = '#FFFFFF'
  const accent = '#6D28D9'

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
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: accent }}>
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
          className="w-full rounded-lg overflow-hidden relative"
          style={{ aspectRatio: '4/5', backgroundColor: slide.slide_type === 'cta' ? accent : bg, border: `1.5px solid ${accent}20` }}
        >
          {slide.image_url ? (
            <img src={slide.image_url} alt="" className="w-full h-full object-cover absolute inset-0" />
          ) : null}
          <div className="absolute inset-0 flex flex-col justify-center px-3 gap-1">
            {slide.slide_type === 'cover' && (
              <>
                {slide.tag_text && <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accent }}>{slide.tag_text}</span>}
                {slide.headline && <span className="text-[13px] font-black leading-tight" style={{ color: '#111' }}>{slide.headline}</span>}
                {slide.subheadline && <span className="text-[9px]" style={{ color: '#666' }}>{slide.subheadline}</span>}
              </>
            )}
            {slide.slide_type === 'body' && (
              <>
                {slide.headline && <span className="text-[12px] font-bold leading-tight" style={{ color: '#111' }}>{slide.headline}</span>}
                {slide.body_paragraph && <span className="text-[8px] leading-relaxed" style={{ color: '#333' }}>{slide.body_paragraph}</span>}
              </>
            )}
            {slide.slide_type === 'cta' && slide.cta_message && (
              <span className="text-[12px] font-black text-center leading-tight" style={{ color: '#FFF' }}>{slide.cta_message}</span>
            )}
          </div>
        </div>

        {/* Campos de texto editáveis por tipo */}
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

        {/* Imagem */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Imagem de fundo</span>
          <div className="flex gap-1.5">
            <button onClick={() => onAbrirGerarImagem(slide.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-purple-200 text-[11px] font-medium text-purple-700 hover:bg-purple-50 transition-colors">
              <Wand2 size={11} /> Gerar IA
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
              <span>{slide.image_source === 'generated' ? 'Gerada por IA' : 'Upload'}</span>
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
          <button
            onClick={() => onNavegar(slide.slide_number - 1)}
            disabled={slide.slide_number <= 1}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] text-neutral-400 font-medium">
            Slide {slide.slide_number} de {totalSlides}
          </span>
          <button
            onClick={() => onNavegar(slide.slide_number + 1)}
            disabled={slide.slide_number >= totalSlides}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30 transition-colors"
          >
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
          <textarea
            autoFocus
            value={valorTemp}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSalvar}
            rows={3}
            className="w-full px-2 py-1.5 rounded border border-purple-400 text-[11px] text-neutral-900 outline-none resize-none focus:ring-1 focus:ring-purple-300"
          />
        ) : (
          <input
            autoFocus
            value={valorTemp}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSalvar}
            onKeyDown={(e) => e.key === 'Enter' && onSalvar()}
            className="w-full px-2 py-1.5 rounded border border-purple-400 text-[11px] text-neutral-900 outline-none focus:ring-1 focus:ring-purple-300"
          />
        )
      ) : (
        <p
          onClick={() => onIniciar(campo, valor ?? '')}
          className="text-[11px] text-neutral-700 leading-relaxed px-2 py-1.5 rounded border border-transparent hover:border-neutral-200 hover:bg-neutral-50 cursor-text transition-colors min-h-[28px]"
        >
          {valor || <span className="text-neutral-300 italic">Clique para editar</span>}
        </p>
      )}
    </div>
  )
}
