import { useState, useEffect, useRef } from 'react'
import { Wand2, RefreshCw } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import {
  generateSlideImage,
  gerarSlideCompleto,
  montarPromptImagemSlide,
  carouselSlideToNodeSlide,
  type CarouselImagePromptContext,
  type NodeSlide,
} from '../../lib/gemini'
import type { CarouselSlide, SlideStyles } from '../../data/mock'

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
  const fullSlideRef = useRef(fullSlide)
  fullSlideRef.current = fullSlide

  useEffect(() => {
    if (open) {
      setPrompt(promptInicial)
      setPromptCriativo('')
      setPromptErro(null)
      setPreview(null)
      setErro(null)
    }
  }, [open, promptInicial])

  async function gerarPromptAutomatico() {
    const fs = fullSlideRef.current
    if (!fs) return
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
      setPromptCriativo(texto)
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

  async function handleGerar() {
    if (variant === 'free_prompt' && !prompt.trim()) return
    if (variant === 'full_slide' && !fullSlide) {
      setErro('Dados do slide indisponíveis.')
      return
    }

    setLoading(true)
    setErro(null)
    try {
      if (variant === 'full_slide' && fullSlide) {
        const narrativa = promptCriativo.trim() || undefined
        const dataUrl = await gerarSlideCompleto({
          slide: carouselSlideToNodeSlide(fullSlide.slide),
          styles: fullSlide.styles,
          visualBrief: fullSlide.visualBrief,
          referenceDescription: fullSlide.referenceDescription,
          narrativaVisual: narrativa,
        })
        setPreview(dataUrl)
      } else {
        const dataUrl = await generateSlideImage(prompt.trim())
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
    const promptHistorico =
      variant === 'full_slide'
        ? promptCriativo.trim() || 'Post completo gerado (texto integrado à arte)'
        : prompt.trim()
    await onConfirmar(preview, promptHistorico, { imageIsFullComposition: variant === 'full_slide' })
    onClose()
  }

  const titulo =
    variant === 'full_slide' ? 'Gerar arte do post (IA)' : 'Gerar imagem com IA'

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      <div className="flex flex-col gap-4">
        {variant === 'full_slide' ? (
          <>
            <p className="text-body-sm text-neutral-600">
              O prompt criativo combina matéria (título, links, texto), sequência do carrossel, tom de voz, tokens do slide e referências visuais. Revise ou edite antes de gerar a imagem.
            </p>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-label font-medium text-neutral-700">Prompt criativo (Imagen)</label>
                <button
                  type="button"
                  onClick={() => void gerarPromptAutomatico()}
                  disabled={promptLoading || !fullSlideRef.current}
                  className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-40"
                >
                  <RefreshCw size={12} /> Regenerar prompt
                </button>
              </div>
              {promptLoading ? (
                <div className="flex items-center gap-2 py-6 justify-center border border-neutral-100 rounded-lg bg-neutral-50">
                  <Spinner size="sm" />
                  <span className="text-body-sm text-neutral-600">Gerando prompt…</span>
                </div>
              ) : (
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors resize-y min-h-[120px]"
                  rows={5}
                  placeholder="Aguardando prompt automático ou escreva aqui…"
                  value={promptCriativo}
                  onChange={(e) => setPromptCriativo(e.target.value)}
                />
              )}
              {promptErro && (
                <p className="text-body-sm text-red-600 mt-1">{promptErro}</p>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="text-label font-medium text-neutral-700 block mb-1">Prompt de imagem</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors resize-none"
              rows={3}
              placeholder="Descreva a imagem que deseja gerar…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Modo livre: útil para fundos ou ilustrações sem texto embutido.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-8 bg-purple-50 rounded-xl border border-purple-100">
            <Spinner size="md" />
            <p className="text-body-md text-purple-700 font-medium">Gerando imagem…</p>
          </div>
        )}

        {preview && !loading && (
          <div className="flex flex-col gap-2">
            <p className="text-label font-semibold text-neutral-500">Preview</p>
            <img src={preview} alt="Imagem gerada" className="w-full rounded-xl border border-neutral-100 object-cover max-h-64" />
          </div>
        )}

        {erro && <p className="text-body-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <div className="flex gap-3 justify-end pt-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => void handleGerar()}
            loading={loading}
            disabled={
              variant === 'free_prompt'
                ? !prompt.trim()
                : promptLoading
            }
          >
            <Wand2 size={14} />
            {preview ? 'Gerar imagem novamente' : 'Gerar imagem'}
          </Button>
          <Button onClick={() => void handleConfirmar()} disabled={!preview || loading}>
            Usar esta imagem
          </Button>
        </div>
      </div>
    </Modal>
  )
}
