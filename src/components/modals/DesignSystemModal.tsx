import { useState, useEffect, type ChangeEvent } from 'react'
import { X, ImageIcon } from 'lucide-react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
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
  /** Quando está editando um DS já salvo: envia ao Storage + grava URLs assim que o usuário escolhe arquivos */
  onAnexarReferencias?: (files: File[]) => Promise<string[]>
}

export default function DesignSystemModal({ open, onClose, onSave, inicial, onAnexarReferencias }: Props) {
  const [dados, setDados] = useState<DesignSystemDraft>(DEFAULT)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [enviandoRefs, setEnviandoRefs] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list?.length) return
    const files = Array.from(list)
    e.target.value = ''

    if (onAnexarReferencias && inicial?.id) {
      setEnviandoRefs(true)
      setErro(null)
      try {
        const novasUrls = await onAnexarReferencias(files)
        setDados((p) => ({ ...p, reference_image_urls: [...p.reference_image_urls, ...novasUrls] }))
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Falha ao enviar imagens')
      } finally {
        setEnviandoRefs(false)
      }
      return
    }

    setPendingFiles((prev) => [...prev, ...files])
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
                {inicial?.id
                  ? ' Ao editar: o envio para o armazenamento ocorre assim que você escolhe os arquivos.'
                  : ' Novo design system: os arquivos escolhidos sobem ao clicar em «Criar design system».'}
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
            type="file"
            accept="image/*"
            multiple
            disabled={enviandoRefs}
            onChange={(e) => void handleFiles(e)}
            className="block w-full text-[11px] text-neutral-600 disabled:opacity-50
              file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-dashed file:border-neutral-300
              file:bg-neutral-50 file:px-3 file:py-2 file:text-[11px] file:font-medium file:text-neutral-700
              hover:file:bg-neutral-100 file:inline-flex file:items-center"
          />
          {enviandoRefs && (
            <div className="flex items-center gap-2 text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
              <Spinner size="sm" />
              Enviando imagens para o armazenamento…
            </div>
          )}
          {!inicial?.id && pendingFiles.length === 0 && (
            <p className="text-[10px] text-neutral-400">
              Nenhum arquivo na fila. Escolha imagens e depois clique em «Criar design system» para gravar e enviar.
            </p>
          )}
          {!inicial?.id && pendingFiles.length > 0 && (
            <p className="text-[11px] font-medium text-purple-800 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
              {pendingFiles.length} arquivo(s) na fila — serão enviados ao criar o design system.
            </p>
          )}
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
