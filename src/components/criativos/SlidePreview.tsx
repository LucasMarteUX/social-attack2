interface SlidePreviewProps {
  numero: number
  texto: string
  total: number
  corCategoria?: string
  categoriaNome?: string
  urlImagem?: string
}

export default function SlidePreview({
  numero,
  texto,
  total,
  corCategoria = '#6D28D9',
  categoriaNome,
  urlImagem,
}: SlidePreviewProps) {
  return (
    <div className="aspect-[4/5] rounded-3xl overflow-hidden relative shadow-modal select-none w-full">
      {/* Fundo: imagem (com overlay) ou gradiente da categoria */}
      {urlImagem ? (
        <>
          <img
            src={urlImagem}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(165deg, ${corCategoria}14 0%, ${corCategoria}38 60%, ${corCategoria}55 100%)`,
            }}
          />
          {/* Detalhe decorativo */}
          <div
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 blur-2xl"
            style={{ backgroundColor: corCategoria }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-15 blur-3xl"
            style={{ backgroundColor: corCategoria }}
          />
        </>
      )}

      {/* Conteúdo */}
      <div className="relative h-full flex flex-col p-7 sm:p-9">
        {/* Header */}
        <div className="flex items-center justify-between">
          {categoriaNome && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md"
              style={{
                backgroundColor: urlImagem ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.7)',
                color: corCategoria,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: corCategoria }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em]">
                {categoriaNome}
              </span>
            </div>
          )}
        </div>

        {/* Texto principal */}
        <div className="flex-1 flex items-center justify-center py-4">
          <p
            className="text-center font-bold leading-[1.15] whitespace-pre-line"
            style={{
              color: urlImagem ? '#fff' : corCategoria,
              fontSize: 'clamp(1.5rem, 4.2vw, 2.25rem)',
              textShadow: urlImagem ? '0 2px 16px rgba(0,0,0,0.35)' : undefined,
              letterSpacing: '-0.01em',
            }}
          >
            {texto || 'Texto do slide…'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <span
            className="text-[10px] font-bold tracking-[0.15em]"
            style={{
              color: urlImagem ? 'rgba(255,255,255,0.8)' : `${corCategoria}AA`,
            }}
          >
            SOCIAL ATTACK
          </span>
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md"
            style={{
              backgroundColor: urlImagem ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)',
              color: urlImagem ? '#fff' : corCategoria,
            }}
          >
            {numero}/{total}
          </div>
        </div>
      </div>
    </div>
  )
}
