import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import type { DesignSystem } from '../../data/mock'

type DesignSystemDraft = Omit<DesignSystem, 'id' | 'created_at' | 'updated_at'>

const DEFAULT: DesignSystemDraft = {
  name: '',
  markdown: '',
  is_active: true,
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
- Parágrafo com máximo 3 linhas
- Ícone ou número no canto superior

## Slide CTA
- Fundo com cor primária
- Texto branco, centralizado
- Botão ou call-to-action em destaque`

interface Props {
  open: boolean
  onClose: () => void
  onSave: (dados: DesignSystemDraft) => Promise<void>
  inicial?: DesignSystem | null
}

export default function DesignSystemModal({ open, onClose, onSave, inicial }: Props) {
  const [dados, setDados] = useState<DesignSystemDraft>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (inicial) {
      const { id: _, created_at: __, updated_at: ___, ...rest } = inicial
      setDados(rest)
    } else {
      setDados(DEFAULT)
    }
    setErro(null)
  }, [inicial, open])

  async function handleSalvar() {
    if (!dados.name.trim()) { setErro('Nome obrigatório.'); return }
    setSaving(true)
    try {
      await onSave(dados)
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
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

        <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} loading={saving}>
            {inicial ? 'Salvar alterações' : 'Criar design system'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
