import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Link2, X, Plus, Sparkles } from 'lucide-react'
import Button from '../ui/Button'
import { useTomDeVoz } from '../../hooks/useTomDeVoz'
import { useDesignSystems } from '../../hooks/useDesignSystems'
import type { NodeCarouselScript } from '../../lib/gemini'

export interface MainNodeData {
  onGerar: (params: {
    titulo: string
    descricao: string
    referencesUrls: string[]
    referencesText: string
    tomId: string
    tomNome: string
    tomDescricao: string
    designSystemId: string
    designSystemMarkdown: string
    designSystemReferenceUrls: string[]
    totalSlides: number
    autoGerarImagens: boolean
  }) => Promise<void>
  gerating?: boolean
}

interface Props {
  data: MainNodeData
}

export default function MainNode({ data }: Props) {
  const { tons } = useTomDeVoz()
  const { designSystems } = useDesignSystems()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urls, setUrls] = useState<string[]>([])
  const [referencesText, setReferencesText] = useState('')
  const [tomId, setTomId] = useState('')
  const [designSystemId, setDesignSystemId] = useState('')
  const [totalSlides, setTotalSlides] = useState(5)
  const [autoGerarImagens, setAutoGerarImagens] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function adicionarUrl() {
    const url = urlInput.trim()
    if (!url) return
    setUrls((p) => [...p, url])
    setUrlInput('')
  }

  async function handleGerar() {
    if (!titulo.trim()) { setErro('Título obrigatório.'); return }
    setErro(null)
    const tom = tons.find((t) => t.id === tomId)
    const ds = designSystems.find((d) => d.id === designSystemId)
    await data.onGerar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      referencesUrls: urls,
      referencesText: referencesText.trim(),
      tomId,
      tomNome: tom?.nome ?? '',
      tomDescricao: tom?.descricao ?? '',
      designSystemId,
      designSystemMarkdown: ds?.markdown ?? '',
      designSystemReferenceUrls: ds?.reference_image_urls ?? [],
      totalSlides,
      autoGerarImagens,
    })
  }

  const generating = data.gerating ?? false

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg w-[340px]">
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-purple-50 rounded-t-2xl">
        <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <p className="text-label font-bold text-purple-800">Node Principal</p>
          <p className="text-[10px] text-purple-500">Configuração do carrossel</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {erro && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg">{erro}</p>}

        {/* Título */}
        <Field label="Título *">
          <input
            className={inputCls}
            placeholder="Ex: 5 erros fatais no Instagram"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>

        {/* Descrição */}
        <Field label="Descrição">
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            placeholder="Contexto geral da campanha..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </Field>

        {/* Links de referência */}
        <Field label="Links de referência">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-100 mb-1">
              <Link2 size={11} className="text-purple-500 flex-shrink-0" />
              <span className="text-[11px] text-purple-800 flex-1 truncate">{url}</span>
              <button onClick={() => setUrls((p) => p.filter((_, idx) => idx !== i))} className="text-purple-400 hover:text-purple-700">
                <X size={11} />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input
              className={`${inputCls} flex-1 text-[11px]`}
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarUrl()}
            />
            <button onClick={adicionarUrl} className="px-2 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
              <Plus size={13} />
            </button>
          </div>
        </Field>

        {/* Referências em texto */}
        <Field label="Referências em texto">
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            placeholder="Cole aqui trechos, notas ou contexto adicional..."
            value={referencesText}
            onChange={(e) => setReferencesText(e.target.value)}
          />
        </Field>

        {/* Tom de voz */}
        <Field label="Tom de voz">
          <select className={inputCls} value={tomId} onChange={(e) => setTomId(e.target.value)}>
            <option value="">Selecionar tom...</option>
            {tons.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </Field>

        {/* Design System */}
        <Field label="Design System">
          <select className={inputCls} value={designSystemId} onChange={(e) => setDesignSystemId(e.target.value)}>
            <option value="">Selecionar design system...</option>
            {designSystems.map((ds) => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </Field>

        {/* Quantidade de slides */}
        <Field label={`Slides: ${totalSlides}`}>
          <input
            type="range"
            min={3}
            max={20}
            value={totalSlides}
            onChange={(e) => setTotalSlides(Number(e.target.value))}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>3</span>
            <span>20</span>
          </div>
        </Field>

        {/* Toggle imagens automáticas */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setAutoGerarImagens((v) => !v)}
            className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${autoGerarImagens ? 'bg-purple-600' : 'bg-neutral-200'}`}
          >
            <div className={`w-3 h-3 bg-white rounded-full shadow mt-0.5 transition-transform ${autoGerarImagens ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-[11px] text-neutral-600">Gerar imagens automaticamente</span>
        </label>

        <Button onClick={handleGerar} loading={generating} size="lg" className="w-full">
          {generating ? 'Gerando carrossel…' : 'Gerar carrossel'}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-2.5 py-1.5 rounded-md border border-neutral-200 text-[12px] text-neutral-900 outline-none focus:border-purple-500 transition-colors bg-white'

// re-export para uso externo
export type { NodeCarouselScript }
