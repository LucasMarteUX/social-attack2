import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronRight, RotateCcw, Check, Sparkles, Instagram } from 'lucide-react'
import BriefingForm, { type BriefingData } from '../components/criativos/BriefingForm'
import SlideEditor from '../components/criativos/SlideEditor'
import SlidePreview from '../components/criativos/SlidePreview'
import SlideCarousel from '../components/criativos/SlideCarousel'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'
import { mockIdeias, mockCategorias } from '../data/mock'

interface ScriptSlide {
  numero: number
  texto: string
}

interface Script {
  titulo: string
  slides: ScriptSlide[]
  legenda: string
  hashtags: string[]
}

async function mockGerarRoteiro(briefing: BriefingData): Promise<Script> {
  await new Promise((r) => setTimeout(r, 2500))

  const aberturas = [
    `${briefing.tema} — o que ninguém te conta`,
    `Tudo que você precisa saber sobre ${briefing.tema}`,
    `Se você ainda não sabe isso sobre ${briefing.tema}, precisa ver agora`,
  ]

  const slides: ScriptSlide[] = Array.from({ length: briefing.qtdSlides }, (_, i) => {
    if (i === 0) return { numero: 1, texto: aberturas[Math.floor(Math.random() * aberturas.length)] }
    if (i === briefing.qtdSlides - 1) {
      return { numero: i + 1, texto: `${briefing.cta}\n\nSalva esse post para não esquecer!` }
    }
    return { numero: i + 1, texto: `Ponto ${i}: [Claude geraria conteúdo específico sobre "${briefing.tema}" aqui]` }
  })

  return {
    titulo: briefing.tema,
    slides,
    legenda: `${briefing.tema}.\n\nVocê já passou por isso? Conta pra mim nos comentários 👇\n\n${briefing.cta}`,
    hashtags: ['#conteudo', '#instagram', '#marketing', '#criadores', '#dicas'],
  }
}

const STEPS = ['Briefing', 'Roteiro', 'Revisão']

export default function CriativoNovoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const ideiaId = searchParams.get('ideia')
  const ideia = ideiaId ? mockIdeias.find((i) => i.id === ideiaId) : null
  const categoriaInicial = ideia ? mockCategorias.find((c) => c.id === ideia.categoria_id) : null

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [script, setScript] = useState<Script | null>(null)
  const [slides, setSlides] = useState<ScriptSlide[]>([])
  const [slideAtivo, setSlideAtivo] = useState(0)

  async function handleBriefingSubmit(data: BriefingData) {
    setBriefing(data)
    setLoading(true)
    setStep(2)
    const resultado = await mockGerarRoteiro(data)
    setScript(resultado)
    setSlides(resultado.slides)
    setLoading(false)
  }

  function handleSlideChange(index: number, texto: string) {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, texto } : s)))
  }

  function handleSalvar() {
    navigate('/criativos')
  }

  async function handleRegenerar() {
    if (!briefing) return
    setStep(2)
    setLoading(true)
    const resultado = await mockGerarRoteiro(briefing)
    setScript(resultado)
    setSlides(resultado.slides)
    setSlideAtivo(0)
    setLoading(false)
  }

  const corCategoria = categoriaInicial?.cor ?? '#6D28D9'
  const nomeCategoria = categoriaInicial?.nome

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-label text-neutral-400 mb-6">
        <Link to="/criativos" className="hover:text-purple-700 transition-colors">Criativos</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-neutral-600">Novo criativo</span>
      </div>

      <h1 className="text-heading-xl font-bold text-neutral-900 mb-2">
        {ideia ? ideia.titulo : 'Novo criativo'}
      </h1>
      <p className="text-body-md text-neutral-500 mb-8 flex items-center gap-2">
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
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors ${
                    done
                      ? 'bg-purple-700 text-white'
                      : active
                      ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-700'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {done ? <Check size={13} /> : stepNum}
                </div>
                <span
                  className={`text-label font-medium ${
                    active ? 'text-purple-700' : done ? 'text-neutral-600' : 'text-neutral-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-10 h-px mx-3 ${step > stepNum ? 'bg-purple-700' : 'bg-neutral-200'}`} />
              )}
            </div>
          )
        })}
      </div>

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
              <div className="flex items-center gap-3 p-5 rounded-2xl bg-purple-50 border border-purple-100">
                <Spinner size="md" />
                <div>
                  <p className="text-body-md font-semibold text-purple-700">Claude está criando seu roteiro…</p>
                  <p className="text-label text-purple-400 mt-0.5">Isso leva alguns segundos</p>
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
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl border border-neutral-100 bg-white"
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-bold text-purple-700">{slide.numero}</span>
                    </div>
                    <p className="text-body-md text-neutral-700 leading-relaxed whitespace-pre-line">{slide.texto}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <p className="text-label font-semibold text-neutral-500 mb-2">Legenda</p>
                <p className="text-body-sm text-neutral-700 whitespace-pre-line leading-relaxed">{script.legenda}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {script.hashtags.map((h) => (
                    <span key={h} className="text-label text-purple-600 font-medium">{h}</span>
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
            {/* Editor (esquerda) */}
            <div>
              <p className="text-label font-semibold text-neutral-500 mb-4 uppercase tracking-wide">
                Editar slides
              </p>
              <SlideEditor
                slides={slides}
                onChange={(i, texto) => {
                  handleSlideChange(i, texto)
                  setSlideAtivo(i)
                }}
              />
            </div>

            {/* Carrossel preview (direita, sticky em desktop) */}
            <div className="lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-label font-semibold text-neutral-500 uppercase tracking-wide">
                  Preview do carrossel
                </p>
                <span className="text-[11px] font-medium text-neutral-400">Arraste →</span>
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

          {/* Legenda preview */}
          <div className="max-w-2xl p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
            <p className="text-label font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
              Legenda gerada
            </p>
            <p className="text-body-md text-neutral-700 whitespace-pre-line leading-relaxed">{script.legenda}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {script.hashtags.map((h) => (
                <span key={h} className="text-label text-purple-600 font-medium">{h}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={handleRegenerar}>
              <RotateCcw size={15} />
              Regenerar
            </Button>
            <Button onClick={handleSalvar} size="lg">
              <Check size={16} />
              Salvar criativo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
