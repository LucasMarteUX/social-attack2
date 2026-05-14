import { useState, useEffect, useRef, useMemo } from 'react'
import { Wand2, RefreshCw, ImagePlus, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import {
  generateSlideImage,
  montarPromptImagemSlide,
  carouselSlideToNodeSlide,
  type CarouselImagePromptContext,
  type GeminiImageInlinePart,
  type NodeSlide,
} from '../../lib/gemini'
import type { CarouselSlide, SlideStyles } from '../../data/mock'

const MAX_PILOTO_FILES = 4

const REFORCO_VARIACAO_FUNDO =
  '\n\n(Reforço: aplicar só como mudança de fundo/camada atrás do texto — preservar a mesma diagramação, tipografia aparente e cores de texto do slide atual.)'

interface FullSlideBundle {
  slide: CarouselSlide
  styles: SlideStyles
  carousel: CarouselImagePromptContext
  allSlides: NodeSlide[]
  visualBrief?: string
  referenceDescription: string
  referenceImageUrls?: string[]
}

export interface IniciarVariacaoFundoPayload {
  slideId: string
  narrativaVisual: string
  referenceInlineParts?: GeminiImageInlinePart[]
}

interface Props {
  open: boolean
  onClose: () => void
  variant: 'free_prompt' | 'full_slide'
  promptInicial?: string
  fullSlide?: FullSlideBundle
  /** Modo livre: após gerar, preview e confirmar */
  onConfirmar?: (imageDataUrl: string, prompt: string, opts?: { imageIsFullComposition?: boolean }) => Promise<void>
  /** Slide completo: só instruções — fecha o modal e gera variação de fundo ao lado */
  onIniciarVariacaoFundo?: (payload: IniciarVariacaoFundoPayload) => void
}

function readFileAsGeminiPart(file: File): Promise<GeminiImageInlinePart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      resolve({
        inlineData: {
          mimeType: file.type || 'image/png',
          data: base64,
        },
      })
    }
    reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'))
    reader.readAsDataURL(file)
  })
}

function PilotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="relative group rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 aspect-square w-20 shrink-0">
      <img src={url} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remover imagem"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function GenerateImageModal({
  open,
  onClose,
  variant,
  promptInicial = '',
  fullSlide,
  onConfirmar,
  onIniciarVariacaoFundo,
}: Props) {
  const [prompt, setPrompt] = useState(promptInicial)
  const [promptCriativo, setPromptCriativo] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptErro, setPromptErro] = useState<string | null>(null)
  const [loadingFree, setLoadingFree] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pilotoFiles, setPilotoFiles] = useState<File[]>([])
  const [enviandoVariacao, setEnviandoVariacao] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fullSlideRef = useRef(fullSlide)
  fullSlideRef.current = fullSlide
  const utilizadorEditouPromptRef = useRef(false)

  useEffect(() => {
    if (!open) return
    setPrompt(promptInicial)
    setPromptCriativo('')
    utilizadorEditouPromptRef.current = false
    setPromptErro(null)
    setPreview(null)
    setErro(null)
    setPilotoFiles([])
    setEnviandoVariacao(false)
  }, [open, promptInicial, fullSlide?.slide.id])

  async function gerarPromptAutomatico() {
    const fs = fullSlideRef.current
    if (!fs) return
    utilizadorEditouPromptRef.current = false
    setPromptLoading(true)
    setPromptErro(null)
    try {
      const node = carouselSlideToNodeSlide(fs.slide)
      const texto = await montarPromptImagemSlide({
        carousel: fs.carousel,
        todosSlides: fs.allSlides,
        slideAtual: node,
        totalSlides: Math.max(1, fs.allSlides.length),
        styles: fs.styles,
        visualBrief: fs.visualBrief,
        referenceDescription: fs.referenceDescription,
        referenceImageUrls: fs.referenceImageUrls,
      })
      if (!utilizadorEditouPromptRef.current) setPromptCriativo(`${texto}${REFORCO_VARIACAO_FUNDO}`)
    } catch (e) {
      setPromptErro(e instanceof Error ? e.message : 'Falha ao montar prompt')
    } finally {
      setPromptLoading(false)
    }
  }

  useEffect(() => {
    if (!open || variant !== 'full_slide' || !fullSlide) return
    void gerarPromptAutomatico()
  }, [open, variant, fullSlide?.slide.id])

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list?.length) return
    const room = MAX_PILOTO_FILES - pilotoFiles.length
    if (room <= 0) return
    const next: File[] = []
    for (let i = 0; i < list.length && next.length < room; i++) {
      const f = list.item(i)
      if (f && f.type.startsWith('image/')) next.push(f)
    }
    setPilotoFiles((prev) => [...prev, ...next])
    e.target.value = ''
  }

  async function pilotoToParts(): Promise<GeminiImageInlinePart[]> {
    const slice = pilotoFiles.slice(0, MAX_PILOTO_FILES)
    return Promise.all(slice.map(readFileAsGeminiPart))
  }

  async function handleGerarFree() {
    if (!prompt.trim() && pilotoFiles.length === 0) {
      setErro('Escreva um prompt ou adicione imagens de referência.')
      return
    }
    if (!onConfirmar) return
    setLoadingFree(true)
    setErro(null)
    try {
      let referenceInlineParts: GeminiImageInlinePart[] | undefined
      if (pilotoFiles.length > 0) {
        referenceInlineParts = await pilotoToParts()
      }
      const dataUrl = await generateSlideImage(prompt.trim(), {
        referenceInlineParts,
      })
      setPreview(dataUrl)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar imagem')
    } finally {
      setLoadingFree(false)
    }
  }

  async function handleConfirmarFree() {
    if (!preview || !onConfirmar) return
    const refsSuffix =
      pilotoFiles.length > 0 ? ` · ${pilotoFiles.length} imagem(ns) piloto` : ''
    await onConfirmar(preview, `${prompt.trim()}${refsSuffix}`, {
      imageIsFullComposition: false,
    })
    onClose()
  }

  async function handleIniciarVariacao() {
    if (variant !== 'full_slide' || !fullSlide || !onIniciarVariacaoFundo) return
    if (!promptCriativo.trim() && pilotoFiles.length === 0) {
      setErro('Escreva instruções para o novo fundo ou adicione imagens de referência.')
      return
    }
    setEnviandoVariacao(true)
    setErro(null)
    try {
      const referenceInlineParts =
        pilotoFiles.length > 0 ? await pilotoToParts() : undefined
      onIniciarVariacaoFundo({
        slideId: fullSlide.slide.id,
        narrativaVisual: promptCriativo.trim(),
        referenceInlineParts,
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao preparar envio')
    } finally {
      setEnviandoVariacao(false)
    }
  }

  const titulo =
    variant === 'full_slide'
      ? 'Variação de fundo (mesmo layout)'
      : 'Gerar imagem com IA'

  const gerarDisabledFree =
    loadingFree || (!prompt.trim() && pilotoFiles.length === 0)

  const gerarDisabledFullSlide =
    enviandoVariacao || (!promptCriativo.trim() && pilotoFiles.length === 0)

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      <div className="flex flex-col gap-4">
        {variant === 'full_slide' ? (
          <>
            <div className="rounded-lg border border-purple-100 bg-purple-50/90 px-3 py-2.5 space-y-1.5">
              <p className="text-body-sm font-semibold text-purple-950">
                O que vai acontecer
              </p>
              <p className="text-[12px] leading-snug text-purple-900">
                Ao clicar em <strong>Gerar variação de fundo</strong>, este modal fecha e o fluxo gera uma{' '}
                <strong>nova opção de imagem</strong> para <strong>este mesmo slide</strong> — mesma tipografia,
                cores de texto e diagramação; muda só a <strong>fotografia / ilustração / textura por detrás</strong>.
                A imagem atual <strong>não é apagada</strong>; a nova aparece em miniaturas em baixo na arte do slide
                para você escolher <strong>Usar</strong> ou descartar.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <label className="text-label font-medium text-neutral-700">
                  Instruções só para o novo fundo
                </label>
                <div className="flex items-center gap-2">
                  {promptLoading && (
                    <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                      <Spinner size="sm" /> A gerar sugestão…
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void gerarPromptAutomatico()}
                    disabled={promptLoading || !fullSlideRef.current}
                    className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-40"
                  >
                    <RefreshCw size={12} /> Regenerar sugestão
                  </button>
                </div>
              </div>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors resize-y min-h-[120px]"
                rows={5}
                placeholder="Ex.: fundo mais escuro com textura subtly tech; manter headline onde está…"
                value={promptCriativo}
                onChange={(e) => {
                  utilizadorEditouPromptRef.current = true
                  setPromptCriativo(e.target.value)
                }}
              />
              {promptErro && (
                <p className="text-body-sm text-red-600 mt-1">{promptErro}</p>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="text-label font-medium text-neutral-700 block mb-1">
              Prompt de imagem
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors resize-none"
              rows={3}
              placeholder="Descreva a imagem que deseja gerar…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Modo livre: fundos ou ilustrações; pode combinar com referências abaixo.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-label font-medium text-neutral-800">Referências visuais (opcional)</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Logo ou mood para o fundo — até {MAX_PILOTO_FILES} imagens. Descreva no texto como aplicar (ex. textura,
                paleta).
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={pilotoFiles.length >= MAX_PILOTO_FILES}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={14} /> Adicionar
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePickFiles}
          />
          {pilotoFiles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pilotoFiles.map((file, idx) => (
                <PilotoThumb
                  key={`${file.name}-${idx}-${file.size}`}
                  file={file}
                  onRemove={() =>
                    setPilotoFiles((prev) => prev.filter((_, i) => i !== idx))
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-neutral-400 italic">Nenhuma imagem anexada.</p>
          )}
        </div>

        {variant === 'free_prompt' && loadingFree && (
          <div className="flex items-center justify-center gap-3 py-8 bg-purple-50 rounded-xl border border-purple-100">
            <Spinner size="md" />
            <p className="text-body-md text-purple-700 font-medium">Gerando imagem…</p>
          </div>
        )}

        {variant === 'free_prompt' && preview && !loadingFree && (
          <div className="flex flex-col gap-2">
            <p className="text-label font-semibold text-neutral-500">Preview</p>
            <div className="w-full max-w-[280px] mx-auto aspect-[4/5] rounded-xl border border-neutral-100 overflow-hidden bg-neutral-100">
              <img
                src={preview}
                alt="Imagem gerada"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {erro && <p className="text-body-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <div className="flex gap-3 justify-end pt-2 flex-wrap">
          {variant === 'full_slide' ? (
            <Button
              variant="secondary"
              onClick={() => void handleIniciarVariacao()}
              loading={enviandoVariacao}
              disabled={gerarDisabledFullSlide}
            >
              <Wand2 size={14} />
              Gerar variação de fundo
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => void handleGerarFree()}
                loading={loadingFree}
                disabled={gerarDisabledFree}
              >
                <Wand2 size={14} />
                {preview ? 'Gerar novamente' : 'Gerar imagem'}
              </Button>
              <Button
                onClick={() => void handleConfirmarFree()}
                disabled={!preview || loadingFree || !onConfirmar}
              >
                Usar esta imagem
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
