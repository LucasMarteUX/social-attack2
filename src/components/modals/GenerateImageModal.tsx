import { useState, useEffect } from 'react'
import { Wand2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { generateSlideImage, gerarSlideCompleto, carouselSlideToNodeSlide } from '../../lib/gemini'
import type { CarouselSlide, SlideStyles } from '../../data/mock'

interface FullSlideContext {
  slide: CarouselSlide
  styles: SlideStyles
  designSystemMarkdown: string
  referenceDescription: string
}

interface Props {
  open: boolean
  onClose: () => void
  variant: 'free_prompt' | 'full_slide'
  promptInicial?: string
  fullSlide?: FullSlideContext
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
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPrompt(promptInicial)
      setPreview(null)
      setErro(null)
    }
  }, [open, promptInicial])

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
        const dataUrl = await gerarSlideCompleto({
          slide: carouselSlideToNodeSlide(fullSlide.slide),
          styles: fullSlide.styles,
          designSystemMarkdown: fullSlide.designSystemMarkdown,
          referenceDescription: fullSlide.referenceDescription,
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
    await onConfirmar(
      preview,
      variant === 'full_slide' ? 'Post completo gerado (texto integrado à arte)' : prompt.trim(),
      { imageIsFullComposition: variant === 'full_slide' }
    )
    onClose()
  }

  const titulo =
    variant === 'full_slide' ? 'Gerar arte do post (IA)' : 'Gerar imagem com IA'

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      <div className="flex flex-col gap-4">
        {variant === 'full_slide' ? (
          <p className="text-body-sm text-neutral-600">
            Será gerada uma imagem única já com o texto do slide aplicado, seguindo o design system e as referências visuais cadastradas (quando houver).
          </p>
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

        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="secondary"
            onClick={() => void handleGerar()}
            loading={loading}
            disabled={variant === 'free_prompt' && !prompt.trim()}
          >
            <Wand2 size={14} />
            {preview ? 'Gerar novamente' : 'Gerar'}
          </Button>
          <Button onClick={() => void handleConfirmar()} disabled={!preview || loading}>
            Usar esta imagem
          </Button>
        </div>
      </div>
    </Modal>
  )
}
