import { useState, useRef } from 'react'
import { Link, Plus, X, Link2, FileText, Upload, Mic2 } from 'lucide-react'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useTomDeVoz } from '../../hooks/useTomDeVoz'

export interface ReferenciaItem {
  tipo: 'url' | 'arquivo'
  valor: string
  nome: string
}

export interface BriefingData {
  tema: string
  tomId: string
  tomNome: string
  qtdSlides: number
  publico: string
  cta: string
  referencias: ReferenciaItem[]
}

interface BriefingFormProps {
  inicial?: { tema?: string }
  onSubmit: (data: BriefingData) => void
  loading?: boolean
}

export default function BriefingForm({ inicial, onSubmit, loading }: BriefingFormProps) {
  const { tons } = useTomDeVoz()

  const [tema, setTema] = useState(inicial?.tema ?? '')
  const [tomId, setTomId] = useState(tons[0]?.id ?? '')
  const [qtdSlides, setQtdSlides] = useState(5)
  const [publico, setPublico] = useState('')
  const [cta, setCta] = useState('')
  const [referencias, setReferencias] = useState<ReferenciaItem[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [erros, setErros] = useState<Partial<Record<'tema' | 'publico' | 'cta', string>>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  const tomSelecionado = tons.find((t) => t.id === tomId)

  function adicionarUrl() {
    const url = urlInput.trim()
    if (!url) return
    const nome = url.replace(/^https?:\/\//, '').split('/')[0]
    setReferencias((p) => [...p, { tipo: 'url', valor: url, nome }])
    setUrlInput('')
    setShowUrlInput(false)
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    const novas: ReferenciaItem[] = arquivos.map((f) => ({
      tipo: 'arquivo',
      valor: f.name,
      nome: f.name,
    }))
    setReferencias((p) => [...p, ...novas])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removerReferencia(index: number) {
    setReferencias((p) => p.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    const novosErros: typeof erros = {}
    if (!tema.trim()) novosErros.tema = 'Campo obrigatório.'
    if (!publico.trim()) novosErros.publico = 'Campo obrigatório.'
    if (!cta.trim()) novosErros.cta = 'Campo obrigatório.'
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return }

    onSubmit({
      tema: tema.trim(),
      tomId,
      tomNome: tomSelecionado?.nome ?? '',
      qtdSlides,
      publico: publico.trim(),
      cta: cta.trim(),
      referencias,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="Tema do post"
        placeholder="Ex: 5 erros que matam seu alcance no Instagram"
        value={tema}
        onChange={(e) => { setTema(e.target.value); setErros((p) => ({ ...p, tema: undefined })) }}
        error={erros.tema}
      />

      {/* Referências */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-label font-medium text-ink-muted">
            Referências <span className="text-ink-faint font-normal">(opcional)</span>
          </label>
        </div>

        {/* Lista de referências adicionadas */}
        {referencias.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-1">
            {referencias.map((ref, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/[0.08] border border-line/[0.1]"
              >
                {ref.tipo === 'url' ? (
                  <Link2 size={13} className="text-ink-muted flex-shrink-0" />
                ) : (
                  <FileText size={13} className="text-ink-muted flex-shrink-0" />
                )}
                <span className="text-body-sm text-ink flex-1 truncate">{ref.valor}</span>
                <button
                  onClick={() => removerReferencia(i)}
                  className="text-ink-faint hover:text-ink transition-colors flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input de URL */}
        {showUrlInput && (
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 px-3.5 py-2.5 rounded-md border border-line/[0.12] text-body-md text-ink placeholder:text-ink-faint outline-none focus:border-accent/45 focus:ring-1 focus:ring-accent/12 transition-colors"
              placeholder="https://exemplo.com/artigo"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarUrl()}
              autoFocus
            />
            <Button variant="secondary" size="sm" onClick={adicionarUrl}>
              Adicionar
            </Button>
            <button
              onClick={() => { setShowUrlInput(false); setUrlInput('') }}
              className="p-2 text-ink-faint hover:text-ink-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Botões de ação */}
        {!showUrlInput && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowUrlInput(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line/[0.12] text-label font-medium text-ink-muted hover:border-accent/35 hover:text-ink hover:bg-accent/[0.08] transition-colors"
            >
              <Link2 size={13} />
              Adicionar link
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line/[0.12] text-label font-medium text-ink-muted hover:border-accent/35 hover:text-ink hover:bg-accent/[0.08] transition-colors"
            >
              <Upload size={13} />
              Fazer upload
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          multiple
          className="hidden"
          onChange={handleArquivo}
        />
        <p className="text-[11px] text-ink-faint">Aceita PDF, Word (.doc, .docx) e texto (.txt)</p>
      </div>

      {/* Tom de voz */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-label font-medium text-ink-muted">Tom de voz</label>
          <Link
            to="/tom-de-voz"
            className="text-[11px] font-semibold text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
          >
            <Plus size={11} />
            Gerenciar tons
          </Link>
        </div>

        {tons.length === 0 ? (
          <div className="p-4 rounded-xl border border-line/[0.12] text-center">
            <p className="text-body-sm text-ink-muted mb-2">Nenhum tom cadastrado.</p>
            <Link
              to="/tom-de-voz"
              className="text-label font-semibold text-ink hover:text-ink transition-colors"
            >
              Criar primeiro tom →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tons.map((tom) => (
              <button
                key={tom.id}
                type="button"
                onClick={() => setTomId(tom.id)}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-colors ${
                  tomId === tom.id
                    ? 'border-accent bg-accent/[0.08]'
                    : 'border-line/[0.12] bg-surface hover:border-line/[0.14]'
                }`}
              >
                <Mic2
                  size={15}
                  className={tomId === tom.id ? 'text-ink-muted' : 'text-ink-faint'}
                />
                <span className={`text-label font-semibold leading-tight ${tomId === tom.id ? 'text-ink' : 'text-ink-muted'}`}>
                  {tom.nome}
                </span>
                <span className="text-[11px] text-ink-faint leading-tight line-clamp-2">
                  {tom.descricao}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantidade de slides */}
      <div className="flex flex-col gap-2">
        <label className="text-label font-medium text-ink-muted">
          Quantidade de slides:{' '}
          <span className="text-ink font-bold">{qtdSlides}</span>
        </label>
        <input
          type="range"
          min={3}
          max={20}
          value={qtdSlides}
          onChange={(e) => setQtdSlides(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-[11px] text-ink-faint">
          <span>3 slides</span>
          <span>20 slides</span>
        </div>
      </div>

      <Input
        label="Público-alvo"
        placeholder="Ex: Empreendedores iniciantes no digital"
        value={publico}
        onChange={(e) => { setPublico(e.target.value); setErros((p) => ({ ...p, publico: undefined })) }}
        error={erros.publico}
      />

      <Input
        label="Call-to-action desejado"
        placeholder="Ex: Salvar o post e seguir o perfil"
        value={cta}
        onChange={(e) => { setCta(e.target.value); setErros((p) => ({ ...p, cta: undefined })) }}
        error={erros.cta}
      />

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} loading={loading} size="lg">
          Gerar roteiro
        </Button>
      </div>
    </div>
  )
}
