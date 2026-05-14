import { useState, useEffect, useRef, useMemo } from 'react'
import { Wand2, RefreshCw, ImagePlus, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import {
  generateSlideImage,
  gerarSlideCompleto,
  montarPromptImagemSlide,
  carouselSlideToNodeSlide,
  type CarouselImagePromptContext,
  type GeminiImageInlinePart,
  type NodeSlide,
} from '../../lib/gemini'
import type { CarouselSlide, SlideStyles } from '../../data/mock'

const MAX_PILOTO_FILES = 4

interface FullSlideBundle {
  slide: CarouselSlide
  styles: SlideStyles
  carousel: CarouselImagePromptContext
  allSlides: NodeSlide[]
  visualBrief?: string
  referenceDescription: string
  referenceImageUrls?: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  variant: 'free_prompt' | 'full_slide'
  promptInicial?: string
  fullSlide?: FullSlideBundle
  onConfirmar: (imageDataUrl: string, prompt: string, opts?: { imageIsFullComposition?: boolean }) => Promise<void>
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
}: Props) {
  const [prompt, setPrompt] = useState(promptInicial)
  const [promptCriativo, setPromptCriativo] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptErro, setPromptErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pilotoFiles, setPilotoFiles] = useState<File[]>([])
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
      if (!utilizadorEditouPromptRef.current) setPromptCriativo(texto)
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

  async function handleGerar() {
    if (variant === 'full_slide' && !fullSlide) {
      setErro('Dados do slide indisponíveis.')
      return
    }
    if (variant === 'free_prompt' && !prompt.trim() && pilotoFiles.length === 0) {
      setErro('Escreva um prompt ou adicione imagens de referência.')
      return
    }
    if (variant === 'full_slide') {
      if (!promptCriativo.trim() && pilotoFiles.length === 0) {
        setErro('Escreva instruções para o fundo/arte ou adicione imagens de referência.')
        return
      }
    }

    setLoading(true)
    setErro(null)
    try {
      let referenceInlineParts: GeminiImageInlinePart[] | undefined
      if (pilotoFiles.length > 0) {
        referenceInlineParts = await pilotoToParts()
      }

      if (variant === 'full_slide' && fullSlide) {
        const narrativa = promptCriativo.trim() || undefined
        const dataUrl = await gerarSlideCompleto({
          slide: carouselSlideToNodeSlide(fullSlide.slide),
          styles: fullSlide.styles,
          visualBrief: fullSlide.visualBrief,
          referenceDescription: fullSlide.referenceDescription,
          narrativaVisual: narrativa,
          referenceInlineParts,
        })
        setPreview(dataUrl)
      } else {
        const dataUrl = await generateSlideImage(prompt.trim(), {
          referenceInlineParts,
        })
        setPreview(dataUrl)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar imagem')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar() {
    if (!preview) return
    const baseHist =
      variant === 'full_slide'
        ? promptCriativo.trim() || 'Post completo gerado (texto integrado à arte)'
        : prompt.trim()
    const refsSuffix =
      pilotoFiles.length > 0 ? ` · ${pilotoFiles.length} imagem(ns) piloto` : ''
    await onConfirmar(preview, `${baseHist}${refsSuffix}`, {
      imageIsFullComposition: variant === 'full_slide',
    })
    onClose()
  }

  const titulo =
    variant === 'full_slide' ? 'Gerar arte do post (IA)' : 'Gerar imagem com IA'

  const gerarDisabled =
    loading ||
    (variant === 'free_prompt'
      ? !prompt.trim() && pilotoFiles.length === 0
      : !promptCriativo.trim() && pilotoFiles.length === 0)

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      <div className="flex flex-col gap-4">
        {variant === 'full_slide' ? (
          <>
            <p className="text-body-sm text-neutral-600">
              Edite o prompt para orientar <strong>fundo e arte</strong> (não altera os textos do slide no editor).
              Opcionalmente envie logo ou imagem piloto — o modelo usa como referência visual na geração nativa;
              no fallback só texto (Imagen), as instruções no campo abaixo são essenciais.
            </p>
            <div>
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <label className="text-label font-medium text-neutral-700">
                  Instruções para fundo e arte (prompt criativo)
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
                    <RefreshCw size={12} /> Regenerar prompt
                  </button>
                </div>
              </div>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors resize-y min-h-[120px]"
                rows={5}
                placeholder="Descreva fundo, texturas, mood, composição… Pode escrever já ou esperar pela sugestão automática."
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
                Logo, piloto de marca ou mood — até {MAX_PILOTO_FILES} imagens. Ajuste o texto acima para dizer
                como usar cada uma (ex.: “logótipo no canto inferior”, “textura de fundo”).
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

        {loading && (
          <div className="flex items-center justify-center gap-3 py-8 bg-purple-50 rounded-xl border border-purple-100">
            <Spinner size="md" />
            <p className="text-body-md text-purple-700 font-medium">Gerando imagem…</p>
          </div>
        )}

        {preview && !loading && (
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
          <Button
            variant="secondary"
            onClick={() => void handleGerar()}
            loading={loading}
            disabled={gerarDisabled}
          >
            <Wand2 size={14} />
            {preview ? 'Gerar novamente' : 'Gerar imagem'}
          </Button>
          <Button onClick={() => void handleConfirmar()} disabled={!preview || loading}>
            Usar esta imagem
          </Button>
        </div>
      </div>
    </Modal>
  )
}
