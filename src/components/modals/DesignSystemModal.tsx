import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import type { DesignSystem } from '../../data/mock'

type DesignSystemDraft = Omit<DesignSystem, 'id' | 'created_at' | 'updated_at'>

const DEFAULT: DesignSystemDraft = {
  name: '',
  description: '',
  is_active: true,
  cover_tag_font_size: 12,
  cover_tag_color: '#6D28D9',
  cover_headline_font_size: 32,
  cover_headline_weight: 'bold',
  cover_headline_font_family: 'Inter',
  cover_subheadline_font_size: 14,
  cover_subheadline_color: '#666666',
  body_headline_font_size: 24,
  body_headline_weight: 'bold',
  body_paragraph_font_size: 16,
  body_paragraph_color: '#333333',
  cta_message_font_size: 28,
  cta_message_weight: 'bold',
  cta_background_color: '#6D28D9',
  cta_text_color: '#FFFFFF',
  global_background_color: '#FFFFFF',
  global_accent_color: '#6D28D9',
  global_font_family: 'Inter',
}

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

  function set<K extends keyof DesignSystemDraft>(key: K, value: DesignSystemDraft[K]) {
    setDados((prev) => ({ ...prev, [key]: value }))
  }

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
      <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">

        {erro && <p className="text-body-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}

        <Input
          label="Nome"
          placeholder="Ex: Moderno Roxo"
          value={dados.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <Input
          label="Descrição (opcional)"
          placeholder="Ex: Estilo minimalista com tipografia bold"
          value={dados.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
        />

        {/* Seção Capa */}
        <Section title="Slide Capa">
          <Row>
            <LabelInput label="Tag — tamanho" type="number" value={dados.cover_tag_font_size} onChange={(v) => set('cover_tag_font_size', Number(v))} />
            <ColorInput label="Tag — cor" value={dados.cover_tag_color} onChange={(v) => set('cover_tag_color', v)} />
          </Row>
          <Row>
            <LabelInput label="Headline — tamanho" type="number" value={dados.cover_headline_font_size} onChange={(v) => set('cover_headline_font_size', Number(v))} />
            <LabelInput label="Headline — peso" value={dados.cover_headline_weight} onChange={(v) => set('cover_headline_weight', v)} />
          </Row>
          <Row>
            <LabelInput label="Subheadline — tamanho" type="number" value={dados.cover_subheadline_font_size} onChange={(v) => set('cover_subheadline_font_size', Number(v))} />
            <ColorInput label="Subheadline — cor" value={dados.cover_subheadline_color} onChange={(v) => set('cover_subheadline_color', v)} />
          </Row>
        </Section>

        {/* Seção Corpo */}
        <Section title="Slides Corpo">
          <Row>
            <LabelInput label="Headline — tamanho" type="number" value={dados.body_headline_font_size} onChange={(v) => set('body_headline_font_size', Number(v))} />
            <LabelInput label="Headline — peso" value={dados.body_headline_weight} onChange={(v) => set('body_headline_weight', v)} />
          </Row>
          <Row>
            <LabelInput label="Parágrafo — tamanho" type="number" value={dados.body_paragraph_font_size} onChange={(v) => set('body_paragraph_font_size', Number(v))} />
            <ColorInput label="Parágrafo — cor" value={dados.body_paragraph_color} onChange={(v) => set('body_paragraph_color', v)} />
          </Row>
        </Section>

        {/* Seção CTA */}
        <Section title="Slide CTA">
          <Row>
            <LabelInput label="Mensagem — tamanho" type="number" value={dados.cta_message_font_size} onChange={(v) => set('cta_message_font_size', Number(v))} />
            <LabelInput label="Mensagem — peso" value={dados.cta_message_weight} onChange={(v) => set('cta_message_weight', v)} />
          </Row>
          <Row>
            <ColorInput label="Fundo" value={dados.cta_background_color} onChange={(v) => set('cta_background_color', v)} />
            <ColorInput label="Texto" value={dados.cta_text_color} onChange={(v) => set('cta_text_color', v)} />
          </Row>
        </Section>

        {/* Seção Global */}
        <Section title="Global">
          <Row>
            <ColorInput label="Fundo" value={dados.global_background_color} onChange={(v) => set('global_background_color', v)} />
            <ColorInput label="Cor de destaque" value={dados.global_accent_color} onChange={(v) => set('global_accent_color', v)} />
          </Row>
          <LabelInput label="Família tipográfica" value={dados.global_font_family} onChange={(v) => set('global_font_family', v)} />
        </Section>

        {/* Preview simplificado */}
        <Section title="Preview">
          <div className="flex gap-3">
            <SlidePreviewMini
              label="Capa"
              bg={dados.global_background_color}
              accent={dados.global_accent_color}
              textColor={dados.cover_tag_color}
              headline={dados.cover_headline_font_size}
            />
            <SlidePreviewMini
              label="Corpo"
              bg={dados.global_background_color}
              accent={dados.global_accent_color}
              textColor={dados.body_paragraph_color}
              headline={dados.body_headline_font_size}
            />
            <SlidePreviewMini
              label="CTA"
              bg={dados.cta_background_color}
              accent={dados.cta_background_color}
              textColor={dados.cta_text_color}
              headline={dados.cta_message_font_size}
            />
          </div>
        </Section>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSalvar} loading={saving}>
          {inicial ? 'Salvar alterações' : 'Criar design system'}
        </Button>
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label font-semibold text-neutral-500 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function LabelInput({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-neutral-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 rounded-md border border-neutral-200 text-body-sm text-neutral-900 outline-none focus:border-purple-500 transition-colors"
      />
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-neutral-500">{label}</label>
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-neutral-200 bg-white">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
        <span className="text-body-sm text-neutral-700 font-mono">{value}</span>
      </div>
    </div>
  )
}

function SlidePreviewMini({ label, bg, accent, textColor, headline }: { label: string; bg: string; accent: string; textColor: string; headline: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div
        className="w-full rounded-lg flex flex-col items-center justify-center gap-1 p-2"
        style={{ backgroundColor: bg, aspectRatio: '4/5', border: `2px solid ${accent}` }}
      >
        <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <div className="w-full h-2 rounded" style={{ backgroundColor: textColor, opacity: 0.7, fontSize: headline }} />
        <div className="w-3/4 h-1 rounded" style={{ backgroundColor: textColor, opacity: 0.4 }} />
      </div>
      <span className="text-[10px] font-medium text-neutral-500">{label}</span>
    </div>
  )
}
