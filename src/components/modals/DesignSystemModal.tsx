import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import type { DesignSystem } from '../../data/mock'

type DesignSystemDraft = Omit<DesignSystem, 'id' | 'created_at' | 'updated_at'>

const DEFAULT: DesignSystemDraft = {
  name: '',
  markdown: '',
  is_active: true,
  reference_image_urls: [],
}

const PLACEHOLDER = `## Cores
- Primária: #6D28D9
- Fundo: #FFFFFF
- Texto: #1A1A1A

## Tipografia
- Headline (capa): 32px, bold, Inter
- Subheadline: 14px, regular
- Corpo: 16px, regular
- CTA: 28px, bold

## Espaçamentos
- Padding interno: 24px
- Gap entre elementos: 12px

## Estilo da Capa
- Tag: uppercase, 12px, cor primária
- Headline centralizado
- Imagem ocupa fundo com overlay

## Slides de Corpo
- Headline alinhado à esquerda
- Parágrafo com máximo de 3 linhas
- Ícone ou número no canto superior

## Slide CTA
- Fundo com cor primária
- Texto branco, centralizado
- Botão ou call-to-action em destaque`

interface Props {
  open: boolean
  onClose: () => void
  onSave: (dados: DesignSystemDraft, options?: { novosArquivosReferencia?: File[] }) => Promise<void>
  inicial?: DesignSystem | null
}

export default function DesignSystemModal({ open, onClose, onSave, inicial }: Props) {
  const [dados, setDados] = useState<DesignSystemDraft>(DEFAULT)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inicial) {
      const { id: _, created_at: __, updated_at: ___, ...rest } = inicial
      setDados({ ...rest, reference_image_urls: rest.reference_image_urls ?? [] })
    } else {
      setDados(DEFAULT)
    }
    setPendingFiles([])
    setErro(null)
  }, [inicial, open])

  async function handleSalvar() {
    if (!dados.name.trim()) {
      setErro('Nome obrigatório.')
      return
    }
    setSaving(true)
    try {
      await onSave(dados, { novosArquivosReferencia: pendingFiles })
      setPendingFiles([])
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function removerUrlSalva(url: string) {
    setDados((p) => ({
      ...p,
      reference_image_urls: p.reference_image_urls.filter((u) => u !== url),
    }))
  }

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list?.length) return
    setPendingFiles((prev) => [...prev, ...Array.from(list)])
    e.target.value = ''
  }

  function removerPending(i: number) {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <Modal open={open} onClose={onClose} title={inicial ? 'Editar Design System' : 'Novo Design System'}>
      <div className="flex flex-col gap-4">
        {erro && <p className="text-body-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <Input
          label="Nome"
          placeholder="Ex: Moderno Roxo"
          value={dados.name}
          onChange={(e) => setDados((p) => ({ ...p, name: e.target.value }))}
        />

        <div className="flex flex-col gap-1">
          <label className="text-label font-medium text-neutral-700">
            Documentação do Design System
          </label>
          <p className="text-[11px] text-neutral-400 mb-1">
            Descreva em markdown as cores, tipografia, espaçamentos e regras de layout.
            A IA consultará esse documento ao gerar os carrosséis.
          </p>
          <textarea
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors resize-none font-mono leading-relaxed"
            rows={16}
            placeholder={PLACEHOLDER}
            value={dados.markdown}
            onChange={(e) => setDados((p) => ({ ...p, markdown: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <div className="flex items-start gap-2">
            <ImageIcon size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <label className="text-label font-medium text-neutral-700 block">
                Referências visuais (opcional)
              </label>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Imagens para orientar estilo na geração (cores, ritmo, hierarquia). Não serão copiadas literalmente.
                Em celulares, use o botão abaixo para abrir a galeria — é mais confiável dentro do modal.
              </p>
            </div>
          </div>

          {dados.reference_image_urls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dados.reference_image_urls.map((url) => (
                <div key={url} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removerUrlSalva(url)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    title="Remover referência"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingFiles.length > 0 && (
            <ul className="flex flex-col gap-1">
              {pendingFiles.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between text-[11px] bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                  <span className="truncate flex-1 mr-2">{f.name}</span>
                  <button type="button" onClick={() => removerPending(i)} className="text-purple-600 hover:text-purple-800">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-neutral-200 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors w-full"
          >
            <Upload size={14} />
            Escolher imagens de referência
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} loading={saving}>
            {inicial ? 'Salvar alterações' : 'Criar design system'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
