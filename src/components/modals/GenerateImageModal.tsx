import { useState, useEffect } from 'react'
import { Wand2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { generateSlideImage } from '../../lib/gemini'

interface Props {
  open: boolean
  onClose: () => void
  promptInicial: string
  onConfirmar: (imageDataUrl: string, prompt: string) => Promise<void>
}

export default function GenerateImageModal({ open, onClose, promptInicial, onConfirmar }: Props) {
  const [prompt, setPrompt] = useState(promptInicial)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setPrompt(promptInicial); setPreview(null); setErro(null) }
  }, [open, promptInicial])

  async function handleGerar() {
    if (!prompt.trim()) return
    setLoading(true)
    setErro(null)
    try {
      const dataUrl = await generateSlideImage(prompt.trim())
      setPreview(dataUrl)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar imagem')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar() {
    if (!preview) return
    await onConfirmar(preview, prompt.trim())
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerar imagem com IA">
      <div className="flex flex-col gap-4">

        <div>
          <label className="text-label font-medium text-neutral-700 block mb-1">Prompt de imagem</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors resize-none"
            rows={3}
            placeholder="Descreva a imagem que deseja gerar…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <p className="text-[11px] text-neutral-400 mt-1">Dica: descreva o cenário, estilo visual, cores e mood.</p>
        </div>

        {/* Preview */}
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
          <Button variant="secondary" onClick={handleGerar} loading={loading}>
            <Wand2 size={14} />
            {preview ? 'Gerar novamente' : 'Gerar imagem'}
          </Button>
          <Button onClick={handleConfirmar} disabled={!preview || loading}>
            Confirmar imagem
          </Button>
        </div>
      </div>
    </Modal>
  )
}
