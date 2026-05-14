import { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { regenerarCampoSlide } from '../../lib/gemini'

interface HistoricoItem {
  id: string
  new_value: string | null
  created_at: string
}

interface Props {
  open: boolean
  onClose: () => void
  slideId: string
  campo: string
  textoAtual: string
  tomNome: string
  slideType: string
  historico: HistoricoItem[]
  onConfirmar: (novoTexto: string, promptUsado?: string) => Promise<void>
}

export default function RegenerateTextModal({ open, onClose, slideId: _, campo, textoAtual, tomNome, slideType, historico, onConfirmar }: Props) {
  const [instrucoes, setInstrucoes] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setPreview(null); setInstrucoes(''); setErro(null) }
  }, [open])

  async function handleRegerar() {
    setLoading(true)
    setErro(null)
    try {
      const texto = await regenerarCampoSlide({
        slideType: slideType as 'cover' | 'body' | 'cta',
        campo,
        textoAtual,
        tomNome,
        instrucoes: instrucoes.trim() || undefined,
      })
      setPreview(texto.trim())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao regenerar')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar() {
    if (!preview) return
    const prompt = `Tom: ${tomNome}. Campo: ${campo}${instrucoes ? `. Instruções: ${instrucoes}` : ''}`
    await onConfirmar(preview, prompt)
    onClose()
  }

  const labelCampo: Record<string, string> = {
    tag_text: 'Tag',
    headline: 'Headline',
    subheadline: 'Subheadline',
    body_paragraph: 'Parágrafo',
    cta_message: 'Mensagem CTA',
  }

  return (
    <Modal open={open} onClose={onClose} title={`Regenerar — ${labelCampo[campo] ?? campo}`}>
      <div className="flex flex-col gap-4">

        {/* Texto atual */}
        <div>
          <p className="text-label font-semibold text-ink-muted mb-1">Texto atual</p>
          <p className="text-body-sm text-ink-muted bg-line/[0.04] p-3 rounded-lg leading-relaxed">{textoAtual || '(vazio)'}</p>
        </div>

        {/* Contexto */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent/[0.08] text-ink">Tom: {tomNome || 'não definido'}</span>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-line/[0.06] text-ink-muted">Slide: {slideType}</span>
        </div>

        {/* Instruções */}
        <div>
          <label className="text-label font-medium text-ink-muted block mb-1">Instruções adicionais (opcional)</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-line/[0.12] text-body-sm text-ink outline-none focus:border-accent/45 focus:ring-1 focus:ring-accent/12 transition-colors resize-none"
            rows={2}
            placeholder="Ex: seja mais direto, use dados, fique abaixo de 10 palavras…"
            value={instrucoes}
            onChange={(e) => setInstrucoes(e.target.value)}
          />
        </div>

        {/* Preview da nova versão */}
        {preview && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-green-600 mb-1">Nova versão gerada</p>
            <p className="text-body-sm text-green-800 leading-relaxed">{preview}</p>
          </div>
        )}

        {erro && <p className="text-body-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        {/* Histórico */}
        {historico.length > 0 && (
          <div>
            <p className="text-label font-semibold text-ink-muted mb-2">Versões anteriores</p>
            <div className="flex flex-col gap-1.5">
              {historico.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setPreview(h.new_value ?? '')}
                  className="text-left text-body-sm text-ink-muted bg-line/[0.04] hover:bg-accent/[0.08] hover:text-ink p-2.5 rounded-lg border border-transparent hover:border-line/[0.1] transition-colors line-clamp-2"
                >
                  {h.new_value}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={handleRegerar} loading={loading}>
            <RotateCcw size={14} />
            {preview ? 'Regenerar novamente' : 'Regenerar'}
          </Button>
          <Button onClick={handleConfirmar} disabled={!preview}>
            Aplicar versão
          </Button>
        </div>
      </div>
    </Modal>
  )
}
