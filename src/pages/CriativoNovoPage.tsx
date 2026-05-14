import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronRight, RotateCcw, Check, Sparkles, Instagram } from 'lucide-react'
import BriefingForm, { type BriefingData } from '../components/criativos/BriefingForm'
import SlideEditor from '../components/criativos/SlideEditor'
import SlidePreview from '../components/criativos/SlidePreview'
import SlideCarousel from '../components/criativos/SlideCarousel'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'
import { useCriativos } from '../hooks/useCriativos'
import { gerarRoteiro, type CarouselScript } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import type { Ideia, Categoria } from '../data/mock'

type ScriptSlide = CarouselScript['slides'][number]

const STEPS = ['Briefing', 'Roteiro', 'Revisão']

export default function CriativoNovoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { criar, salvarComSlides, categorias } = useCriativos()

  const ideiaId = searchParams.get('ideia')
  const [ideia, setIdeia] = useState<Ideia | null>(null)
  const [categoriaInicial, setCategoriaInicial] = useState<Categoria | null>(null)

  useEffect(() => {
    if (!ideiaId) return
    supabase
      .from('ideias')
      .select('*, referencias(*)')
      .eq('id', ideiaId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const mapped: Ideia = {
          ...data,
          referencias: (data.referencias ?? []).map((r: { tipo: string; valor: string }) => ({
            tipo: r.tipo as 'url' | 'texto',
            valor: r.valor,
          })),
        }
        setIdeia(mapped)
      })
  }, [ideiaId])

  useEffect(() => {
    if (!ideia || categorias.length === 0) return
    const cat = categorias.find((c) => c.id === ideia.categoria_id) ?? null
    setCategoriaInicial(cat)
  }, [ideia, categorias])

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [script, setScript] = useState<CarouselScript | null>(null)
  const [slides, setSlides] = useState<ScriptSlide[]>([])
  const [slideAtivo, setSlideAtivo] = useState(0)

  async function handleBriefingSubmit(data: BriefingData) {
    setBriefing(data)
    setErro(null)
    setLoading(true)
    setStep(2)
    try {
      const resultado = await gerarRoteiro({
        tema: data.tema,
        tomNome: data.tomNome,
        publico: data.publico,
        cta: data.cta,
        qtdSlides: data.qtdSlides,
        referencias: data.referencias,
      })
      setScript(resultado)
      setSlides(resultado.slides)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar roteiro')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerar() {
    if (!briefing) return
    setStep(2)
    setErro(null)
    setLoading(true)
    try {
      const resultado = await gerarRoteiro({
        tema: briefing.tema,
        tomNome: briefing.tomNome,
        publico: briefing.publico,
        cta: briefing.cta,
        qtdSlides: briefing.qtdSlides,
        referencias: briefing.referencias,
      })
      setScript(resultado)
      setSlides(resultado.slides)
      setSlideAtivo(0)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao regenerar')
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvar() {
    if (!script || !briefing) return
    setLoading(true)
    try {
      const categoriaId = categoriaInicial?.id ?? categorias[0]?.id ?? ''
      const criativo = await criar({
        titulo: script.titulo,
        tipo: 'carrossel',
        categoria_id: categoriaId,
        ideia_id: ideiaId ?? undefined,
        tom_de_voz_id: briefing.tomId || undefined,
      })
      await salvarComSlides(
        criativo.id,
        { legenda: script.legenda, hashtags: script.hashtags, status: 'rascunho' },
        slides
      )
      navigate('/criativos')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
      setLoading(false)
    }
  }

  const corCategoria = categoriaInicial?.cor ?? '#6D28D9'
  const nomeCategoria = categoriaInicial?.nome

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-2 text-label text-ink-faint mb-6">
        <Link to="/criativos" className="hover:text-ink transition-colors">Criativos</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-ink-muted">Novo criativo</span>
      </div>

      <h1 className="text-heading-xl font-bold text-ink mb-2">
        {ideia ? ideia.titulo : 'Novo criativo'}
      </h1>
      <p className="text-body-md text-ink-muted mb-8 flex items-center gap-2">
        <Instagram size={14} />
        Carrossel para Instagram · proporção 4:5 (1080×1350)
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-10 flex-wrap">
        {STEPS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const done = step > stepNum
          const active = step === stepNum
          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors ${done ? 'bg-accent text-bg' : active ? 'bg-line/[0.08] text-ink ring-2 ring-accent' : 'bg-line/[0.06] text-ink-faint'}`}>
                  {done ? <Check size={13} /> : stepNum}
                </div>
                <span className={`text-label font-medium ${active ? 'text-ink' : done ? 'text-ink-muted' : 'text-ink-faint'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-10 h-px mx-3 ${step > stepNum ? 'bg-accent' : 'bg-line/[0.12]'}`} />
              )}
            </div>
          )
        })}
      </div>

      {erro && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-body-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Step 1 — Briefing */}
      {step === 1 && (
        <div className="max-w-2xl">
          <BriefingForm
            inicial={{ tema: ideia?.titulo }}
            onSubmit={handleBriefingSubmit}
          />
        </div>
      )}

      {/* Step 2 — Geração / Roteiro */}
      {step === 2 && (
        <div className="max-w-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="flex items-center gap-3 p-5 rounded-2xl bg-accent/[0.08] border border-line/[0.1]">
                <Spinner size="md" />
                <div>
                  <p className="text-body-md font-semibold text-ink">Gemini está criando seu roteiro…</p>
                  <p className="text-label text-ink-faint mt-0.5">
                    {briefing?.referencias.some((r) => r.tipo === 'url')
                      ? 'Pesquisando referências e gerando conteúdo…'
                      : 'Isso leva alguns segundos'}
                  </p>
                </div>
              </div>
            </div>
          ) : script ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-100">
                <Sparkles size={16} className="text-green-600 flex-shrink-0" />
                <p className="text-body-md text-green-700 font-medium">Roteiro gerado! Revise abaixo.</p>
              </div>

              <div className="flex flex-col gap-3">
                {script.slides.map((slide, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-line/[0.08] bg-surface">
                    <div className="w-6 h-6 rounded-full bg-line/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-bold text-ink">{slide.numero}</span>
                    </div>
                    <p className="text-body-md text-ink-muted leading-relaxed whitespace-pre-line">{slide.texto}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-line/[0.04] border border-line/[0.08]">
                <p className="text-label font-semibold text-ink-muted mb-2">Legenda</p>
                <p className="text-body-sm text-ink-muted whitespace-pre-line leading-relaxed">{script.legenda}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {script.hashtags.map((h) => (
                    <span key={h} className="text-label text-ink-muted font-medium">{h}</span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={handleRegenerar}>
                  <RotateCcw size={15} />
                  Regenerar
                </Button>
                <Button onClick={() => setStep(3)} size="lg">
                  Revisar e editar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Step 3 — Revisão */}
      {step === 3 && script && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
            <div>
              <p className="text-label font-semibold text-ink-muted mb-4 uppercase tracking-wide">Editar slides</p>
              <SlideEditor
                slides={slides}
                onChange={(i, texto) => {
                  setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, texto } : s)))
                  setSlideAtivo(i)
                }}
              />
            </div>
            <div className="lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-label font-semibold text-ink-muted uppercase tracking-wide">Preview do carrossel</p>
                <span className="text-[11px] font-medium text-ink-faint">Arraste →</span>
              </div>
              <SlideCarousel
                current={slideAtivo}
                onChange={setSlideAtivo}
                slides={slides.map((s) => (
                  <SlidePreview
                    key={s.numero}
                    numero={s.numero}
                    texto={s.texto}
                    total={slides.length}
                    corCategoria={corCategoria}
                    categoriaNome={nomeCategoria}
                  />
                ))}
              />
            </div>
          </div>

          <div className="max-w-2xl p-5 rounded-2xl bg-line/[0.04] border border-line/[0.08]">
            <p className="text-label font-semibold text-ink-muted mb-2 uppercase tracking-wide">Legenda gerada</p>
            <p className="text-body-md text-ink-muted whitespace-pre-line leading-relaxed">{script.legenda}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {script.hashtags.map((h) => (
                <span key={h} className="text-label text-ink-muted font-medium">{h}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={handleRegenerar} loading={loading}>
              <RotateCcw size={15} />
              Regenerar
            </Button>
            <Button onClick={handleSalvar} size="lg" loading={loading}>
              <Check size={16} />
              Salvar criativo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
