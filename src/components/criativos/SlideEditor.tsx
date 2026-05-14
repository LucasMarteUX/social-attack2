import { useState } from 'react'
import { Pencil, ChevronDown, ChevronUp } from 'lucide-react'

interface SlideItem {
  numero: number
  texto: string
}

interface SlideEditorProps {
  slides: SlideItem[]
  onChange: (index: number, texto: string) => void
}

type Modo = 'individual' | 'todos'

function getLabel(index: number, total: number) {
  if (index === 0) return 'Abertura'
  if (index === total - 1) return 'Encerramento'
  return `Slide ${index + 1}`
}

export default function SlideEditor({ slides, onChange }: SlideEditorProps) {
  const [modo, setModo] = useState<Modo>('individual')
  const [abertos, setAbertos] = useState<Set<number>>(new Set([0]))

  function toggleSlide(index: number) {
    setAbertos((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handleModo(m: Modo) {
    setModo(m)
    if (m === 'todos') setAbertos(new Set(slides.map((_, i) => i)))
    else setAbertos(new Set([0]))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Seletor de modo */}
      <div className="flex items-center justify-between">
        <span className="text-label text-ink-muted">
          {slides.length} slide{slides.length !== 1 ? 's' : ''}
        </span>
        <div className="inline-flex p-0.5 rounded-full bg-line/[0.06] border border-line/[0.12]">
          {(['individual', 'todos'] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModo(m)}
              className={`px-3.5 py-1 rounded-full text-label font-semibold transition-all ${
                modo === m
                  ? 'bg-surface text-ink border border-line/[0.12]'
                  : 'text-ink-muted hover:text-ink-muted'
              }`}
            >
              {m === 'individual' ? 'Individual' : 'Editar todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de slides */}
      <div className="flex flex-col gap-2">
        {slides.map((slide, i) => {
          const expandido = abertos.has(i)
          const label = getLabel(i, slides.length)

          return (
            <div
              key={i}
              className="rounded-2xl border border-line/[0.12] bg-surface overflow-hidden"
            >
              {/* Header do slide */}
              <button
                onClick={() => toggleSlide(i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-line/[0.04] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-line/[0.08] flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-ink">{slide.numero}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label font-semibold text-ink-muted">{label}</p>
                  {!expandido && (
                    <p className="text-[11px] text-ink-faint truncate mt-0.5 leading-snug">
                      {slide.texto || 'Sem conteúdo ainda…'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!expandido && (
                    <Pencil size={13} className="text-ink-faint" />
                  )}
                  {expandido
                    ? <ChevronUp size={15} className="text-ink-faint" />
                    : <ChevronDown size={15} className="text-ink-faint" />
                  }
                </div>
              </button>

              {/* Textarea (visível quando expandido) */}
              {expandido && (
                <div className="px-4 pb-4">
                  <textarea
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line/[0.12] text-body-md text-ink placeholder:text-ink-faint outline-none focus:border-accent/45 focus:ring-1 focus:ring-accent/12 resize-none transition-colors bg-line/[0.04]"
                    rows={4}
                    placeholder={`Texto do slide ${slide.numero}…`}
                    value={slide.texto}
                    onChange={(e) => onChange(i, e.target.value)}
                    autoFocus={modo === 'individual'}
                  />
                  <p className="text-[11px] text-ink-faint mt-1.5 text-right">
                    {slide.texto.length} caracteres
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
