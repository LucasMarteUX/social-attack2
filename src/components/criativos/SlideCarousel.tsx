import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SlideCarouselProps {
  slides: ReactNode[]
  current: number
  onChange: (index: number) => void
  showArrows?: boolean
  showDots?: boolean
}

export default function SlideCarousel({
  slides,
  current,
  onChange,
  showArrows = true,
  showDots = true,
}: SlideCarouselProps) {
  const total = slides.length
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  function handleStart(clientX: number) {
    setIsDragging(true)
    startX.current = clientX
    setDragOffset(0)
  }

  function handleMove(clientX: number) {
    if (!isDragging) return
    setDragOffset(clientX - startX.current)
  }

  function handleEnd() {
    if (!isDragging) return
    const width = containerRef.current?.offsetWidth ?? 0
    const threshold = width * 0.18

    let next = current
    if (dragOffset < -threshold && current < total - 1) next = current + 1
    else if (dragOffset > threshold && current > 0) next = current - 1

    if (next !== current) onChange(next)
    setDragOffset(0)
    setIsDragging(false)
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isDragging) handleMove(e.clientX)
    }
    function onMouseUp() {
      if (isDragging) handleEnd()
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset, current])

  const widthPx = containerRef.current?.offsetWidth ?? 1
  const dragPercent = (dragOffset / widthPx) * 100
  const translateX = -current * 100 + dragPercent

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className={`overflow-hidden rounded-3xl ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={(e) => {
          e.preventDefault()
          handleStart(e.clientX)
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div
          className={`flex ${isDragging ? '' : 'transition-transform duration-400 ease-out'}`}
          style={{ transform: `translateX(${translateX}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full flex-shrink-0 px-0">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Setas (desktop) */}
      {showArrows && total > 1 && (
        <>
          <button
            onClick={() => onChange(Math.max(0, current - 1))}
            disabled={current === 0}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface shadow-md items-center justify-center text-ink-muted disabled:opacity-0 disabled:cursor-default hover:bg-line/[0.04] transition-all"
            aria-label="Slide anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onChange(Math.min(total - 1, current + 1))}
            disabled={current === total - 1}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface shadow-md items-center justify-center text-ink-muted disabled:opacity-0 disabled:cursor-default hover:bg-line/[0.04] transition-all"
            aria-label="Próximo slide"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dots */}
      {showDots && total > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-6 bg-accent' : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
