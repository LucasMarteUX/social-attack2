import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import MainNode from '../components/nodes/MainNode'
import SlideNode from '../components/nodes/SlideNode'
import RegenerateTextModal from '../components/modals/RegenerateTextModal'
import GenerateImageModal from '../components/modals/GenerateImageModal'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { useCarousels } from '../hooks/useCarousels'
import { useCarouselSlides } from '../hooks/useCarouselSlides'
import { useDesignSystems } from '../hooks/useDesignSystems'
import { gerarRoteirosNodes, gerarSlideCompleto, analisarReferenciasVisuais, carouselSlideToNodeSlide } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import type { CarouselSlide, SlideStyles } from '../data/mock'
import { DEFAULT_SLIDE_STYLES } from '../data/mock'

const NODE_TYPES = { mainNode: MainNode, slideNode: SlideNode }

const MAIN_NODE_ID = 'main'
const MAIN_NODE_X = 0
const MAIN_NODE_Y = 0
const SLIDE_OFFSET_Y = 480
const SLIDE_GAP_X = 340

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  generating: 'Gerando...',
  ready: 'Pronto',
  published: 'Publicado',
}
const STATUS_VARIANTS: Record<string, 'neutral' | 'alert' | 'success'> = {
  draft: 'neutral',
  generating: 'alert',
  ready: 'success',
  published: 'neutral',
}

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'novo'

  const { criar: criarCarousel, atualizarStatus, getById, carousels } = useCarousels()
  const { designSystems } = useDesignSystems()

  const [carouselId, setCarouselId] = useState<string | null>(isNew ? null : (id ?? null))
  const { slides, loading: slidesLoading, inserirSlides, editarTexto, resetarTexto, atualizarImagem, atualizarTextoRegenerado, buscarHistorico } = useCarouselSlides(carouselId ?? '')

  const [, setSlideStyles] = useState<SlideStyles>(DEFAULT_SLIDE_STYLES)
  const slideStylesRef = useRef<SlideStyles>(DEFAULT_SLIDE_STYLES)
  const slidesInitialized = useRef(false)
  const designSystemMarkdownRef = useRef('')
  const visualRefDescRef = useRef('')

  const [, setGenerating] = useState(false)
  const [regenModal, setRegenModal] = useState<{ slideId: string; campo: string; textoAtual: string; slideType: string; historico: ReturnType<typeof buscarHistorico> extends Promise<infer T> ? T : never } | null>(null)
  const [regenHistorico, setRegenHistorico] = useState<{ id: string; new_value: string | null; created_at: string }[]>([])
  const [imageModal, setImageModal] = useState<{ slideId: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function syncDsContext() {
      if (!carouselId || isNew) return
      const car = carousels.find((c) => c.id === carouselId)
      const dsId = car?.design_system_id
      if (!dsId) {
        designSystemMarkdownRef.current = ''
        visualRefDescRef.current = ''
        return
      }
      const ds = designSystems.find((d) => d.id === dsId)
      designSystemMarkdownRef.current = ds?.markdown ?? ''
      const urls = ds?.reference_image_urls ?? []
      if (!urls.length) {
        visualRefDescRef.current = ''
        return
      }
      try {
        const desc = await analisarReferenciasVisuais(urls)
        if (!cancelled) visualRefDescRef.current = desc
      } catch {
        if (!cancelled) visualRefDescRef.current = ''
      }
    }
    void syncDsContext()
    return () => {
      cancelled = true
    }
  }, [carouselId, isNew, carousels, designSystems])

  // Quando abrindo workspace existente: carrega estilos do carrossel
  useEffect(() => {
    if (isNew || !carouselId) return
    const car = getById(carouselId)
    if (!car) return
    if (car.styles) {
      setSlideStyles(car.styles)
      slideStylesRef.current = car.styles
    }
  }, [carousels, isNew, carouselId]) // eslint-disable-line

  // Quando slides carregam para workspace existente: renderiza os nodes
  useEffect(() => {
    if (isNew || slidesInitialized.current || slides.length === 0) return
    slidesInitialized.current = true
    renderizarSlideNodes(slides, slideStylesRef.current)
  }, [slides]) // eslint-disable-line

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    isNew ? [{
      id: MAIN_NODE_ID,
      type: 'mainNode',
      position: { x: MAIN_NODE_X, y: MAIN_NODE_Y },
      data: { onGerar: handleGerar, gerating: false },
    }] : []
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  async function handleGerar(params: {
    titulo: string
    descricao: string
    referencesUrls: string[]
    referencesText: string
    tomId: string
    tomNome: string
    tomDescricao: string
    designSystemId: string
    designSystemMarkdown: string
    designSystemReferenceUrls: string[]
    totalSlides: number
    autoGerarImagens: boolean
  }) {
    setGenerating(true)
    setNodes((nds) => nds.map((n) => n.id === MAIN_NODE_ID ? { ...n, data: { ...n.data, gerating: true } } : n))

    try {
      const script = await gerarRoteirosNodes({
        titulo: params.titulo,
        descricao: params.descricao,
        referencesUrls: params.referencesUrls,
        referencesText: params.referencesText,
        tomNome: params.tomNome,
        tomDescricao: params.tomDescricao,
        designSystemMarkdown: params.designSystemMarkdown,
        totalSlides: params.totalSlides,
      })

      const estilos = script.styles ?? DEFAULT_SLIDE_STYLES
      setSlideStyles(estilos)
      slideStylesRef.current = estilos

      let referenceDescription = ''
      const refUrls = params.designSystemReferenceUrls ?? []
      if (refUrls.length) {
        try {
          referenceDescription = await analisarReferenciasVisuais(refUrls)
        } catch {
          referenceDescription = ''
        }
      }
      designSystemMarkdownRef.current = params.designSystemMarkdown
      visualRefDescRef.current = referenceDescription

      const carousel = await criarCarousel({
        title: params.titulo,
        description: params.descricao || null,
        references_urls: params.referencesUrls,
        references_text: params.referencesText || null,
        total_slides: params.totalSlides,
        design_system_id: params.designSystemId || null,
        tone_of_voice_id: params.tomId || null,
        styles: estilos,
      })
      setCarouselId(carousel.id)
      await atualizarStatus(carousel.id, 'generating')

      const slidesParaInserir = script.slides.map((s) => ({
        carousel_id: carousel.id,
        slide_number: s.slide_number,
        slide_type: s.slide_type,
        tag_text: s.tag_text ?? null,
        headline: s.headline ?? null,
        subheadline: s.subheadline ?? null,
        body_paragraph: s.body_paragraph ?? null,
        cta_message: s.cta_message ?? null,
        original_tag_text: s.tag_text ?? null,
        original_headline: s.headline ?? null,
        original_subheadline: s.subheadline ?? null,
        original_body_paragraph: s.body_paragraph ?? null,
        original_cta_message: s.cta_message ?? null,
        image_url: null,
        image_source: 'none' as const,
        image_generation_prompt: null,
        image_is_full_composition: false,
        is_text_edited: false,
        is_image_edited: false,
        regenerate_text_count: 0,
        regenerate_image_count: 0,
      }))

      const novosSlides = await inserirSlides(slidesParaInserir)
      await atualizarStatus(carousel.id, 'ready')

      renderizarSlideNodes(novosSlides, estilos)

      // Atualiza URL sem re-montar
      window.history.replaceState(null, '', `/workspace/${carousel.id}`)

      if (params.autoGerarImagens) {
        gerarImagensEmBackground(novosSlides, carousel.id, {
          styles: estilos,
          designSystemMarkdown: params.designSystemMarkdown,
          referenceDescription,
        }).catch(console.error)
      }

    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
      setNodes((nds) => nds.map((n) => n.id === MAIN_NODE_ID ? { ...n, data: { ...n.data, gerating: false } } : n))
    }
  }

  async function gerarImagensEmBackground(
    slidesList: CarouselSlide[],
    cId: string,
    ctx: { styles: SlideStyles; designSystemMarkdown: string; referenceDescription: string }
  ) {
    setNodes((nds) => nds.map((n) =>
      n.id.startsWith('slide-') ? { ...n, data: { ...n.data, imageGenerating: true } } : n
    ))

    await Promise.allSettled(
      slidesList.map(async (slide) => {
        try {
          const dataUrl = await gerarSlideCompleto({
            slide: carouselSlideToNodeSlide(slide),
            styles: ctx.styles,
            designSystemMarkdown: ctx.designSystemMarkdown,
            referenceDescription: ctx.referenceDescription,
          })
          const path = `${cId}/${slide.id}/full-${slide.slide_number}.png`
          const blob = dataURLtoBlob(dataUrl)
          const { data: storageData, error } = await supabase.storage
            .from('carousel-images')
            .upload(path, blob, { upsert: true, contentType: blob.type || 'image/png' })
          if (!error && storageData) {
            const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(storageData.path)
            await atualizarImagem(
              slide.id,
              urlData.publicUrl,
              'generated',
              'Post completo (texto + layout via IA)',
              true
            )
          }
        } catch {
          /* falha silenciosa por slide */
        } finally {
          setNodes((nds) => nds.map((n) =>
            n.id === `slide-${slide.id}` ? { ...n, data: { ...n.data, imageGenerating: false } } : n
          ))
          refreshSlideNode(slide.id)
        }
      })
    )
  }

  function dataURLtoBlob(dataUrl: string): Blob {
    const [header, data] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const binary = atob(data)
    const arr = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  function renderizarSlideNodes(slidesList: CarouselSlide[], estilos: SlideStyles) {
    const totalWidth = slidesList.length * SLIDE_GAP_X
    const startX = MAIN_NODE_X - totalWidth / 2 + SLIDE_GAP_X / 2

    const novosNodes: Node[] = slidesList.map((slide, i) => ({
      id: `slide-${slide.id}`,
      type: 'slideNode',
      position: { x: startX + i * SLIDE_GAP_X, y: isNew ? MAIN_NODE_Y + SLIDE_OFFSET_Y : MAIN_NODE_Y },
      data: buildSlideData(slide, estilos, slidesList.length),
    }))

    const novosEdges: Edge[] = isNew ? slidesList.map((slide) => ({
      id: `edge-main-${slide.id}`,
      source: MAIN_NODE_ID,
      target: `slide-${slide.id}`,
      style: { stroke: '#6D28D9', strokeWidth: 1.5, opacity: 0.4 },
    })) : []

    setNodes((nds) => {
      const mainNode = nds.find((n) => n.id === MAIN_NODE_ID)
      return mainNode ? [mainNode, ...novosNodes] : novosNodes
    })
    setEdges(novosEdges)
  }

  function buildSlideData(slide: CarouselSlide, estilos: SlideStyles, total: number) {
    return {
      slide,
      styles: estilos,
      totalSlides: total,
      onEditarTexto: async (slideId: string, campo: string, valor: string) => {
        await editarTexto(slideId, campo as keyof Pick<CarouselSlide, 'tag_text' | 'headline' | 'subheadline' | 'body_paragraph' | 'cta_message'>, valor)
        refreshSlideNode(slideId)
      },
      onResetarTexto: async (slideId: string) => {
        await resetarTexto(slideId)
        refreshSlideNode(slideId)
      },
      onAbrirRegenerar: async (slideId: string, campo: string, textoAtual: string) => {
        const hist = await buscarHistorico(slideId, 3)
        setRegenHistorico(hist)
        setRegenModal({ slideId, campo, textoAtual, slideType: slide.slide_type, historico: hist })
      },
      onAbrirGerarImagem: (slideId: string) => {
        setImageModal({ slideId })
      },
      onUploadImagem: async (slideId: string, file: File) => {
        const path = `${carouselId}/${slideId}/${file.name}`
        const { data, error } = await supabase.storage.from('carousel-images').upload(path, file, { upsert: true })
        if (error) throw new Error(error.message)
        const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(data.path)
        await atualizarImagem(slideId, urlData.publicUrl, 'uploaded')
        refreshSlideNode(slideId)
      },
      onRemoverImagem: async (slideId: string) => {
        await atualizarImagem(slideId, null, 'none')
        refreshSlideNode(slideId)
      },
      onNavegar: (_slideNumber: number) => {},
    }
  }

  function refreshSlideNode(slideId: string) {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== `slide-${slideId}`) return n
        const slideAtualizado = slides.find((s) => s.id === slideId)
        if (!slideAtualizado) return n
        return { ...n, data: buildSlideData(slideAtualizado, slideStylesRef.current, slides.length) }
      })
    )
  }

  async function handleConfirmarRegenerar(novoTexto: string, promptUsado?: string) {
    if (!regenModal) return
    await atualizarTextoRegenerado(
      regenModal.slideId,
      regenModal.campo as keyof Pick<CarouselSlide, 'tag_text' | 'headline' | 'subheadline' | 'body_paragraph' | 'cta_message'>,
      novoTexto,
      promptUsado
    )
    refreshSlideNode(regenModal.slideId)
  }

  async function handleConfirmarImagem(
    imageDataUrl: string,
    prompt: string,
    opts?: { imageIsFullComposition?: boolean }
  ) {
    if (!imageModal || !carouselId) return
    const path = `${carouselId}/${imageModal.slideId}/modal-${Date.now()}.png`
    const blob = dataURLtoBlob(imageDataUrl)
    const { data: storageData, error } = await supabase.storage
      .from('carousel-images')
      .upload(path, blob, { upsert: true, contentType: blob.type || 'image/png' })
    if (error) throw new Error(error.message)
    const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(storageData.path)
    await atualizarImagem(
      imageModal.slideId,
      urlData.publicUrl,
      'generated',
      prompt,
      opts?.imageIsFullComposition ?? false
    )
    refreshSlideNode(imageModal.slideId)
  }

  const carouselInfo = !isNew && carouselId ? getById(carouselId) : null
  const modalSlide = imageModal ? slides.find((s) => s.id === imageModal.slideId) : undefined

  return (
    <div className="w-full h-[calc(100vh-64px)] relative">

      {/* Barra de info para workspace existente */}
      {!isNew && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm rounded-xl border border-neutral-100 shadow-md px-4 py-2.5 flex items-center gap-3 min-w-0 max-w-md">
          <button
            onClick={() => navigate('/workspace')}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <p className="text-body-md font-semibold text-neutral-900 truncate flex-1 min-w-0">
            {carouselInfo?.title ?? '…'}
          </p>
          {carouselInfo && (
            <>
              <Badge variant={STATUS_VARIANTS[carouselInfo.status] ?? 'default'}>
                {STATUS_LABELS[carouselInfo.status] ?? carouselInfo.status}
              </Badge>
              <span className="text-[11px] text-neutral-400 flex-shrink-0">
                {carouselInfo.total_slides} slides
              </span>
            </>
          )}
        </div>
      )}

      {/* Loading de slides para workspace existente */}
      {!isNew && slidesLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-20">
          <Spinner size="lg" />
          <p className="ml-3 text-body-md text-neutral-600">Carregando workspace…</p>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={20} size={1} color="#e5e7eb" />
        <Controls />
        <MiniMap nodeColor="#6D28D9" maskColor="rgba(0,0,0,0.05)" />
      </ReactFlow>

      {regenModal && (
        <RegenerateTextModal
          open={!!regenModal}
          onClose={() => setRegenModal(null)}
          slideId={regenModal.slideId}
          campo={regenModal.campo}
          textoAtual={regenModal.textoAtual}
          tomNome=""
          slideType={regenModal.slideType}
          historico={regenHistorico}
          onConfirmar={handleConfirmarRegenerar}
        />
      )}

      {imageModal && modalSlide && (
        <GenerateImageModal
          open
          onClose={() => setImageModal(null)}
          variant="full_slide"
          fullSlide={{
            slide: modalSlide,
            styles: slideStylesRef.current,
            designSystemMarkdown: designSystemMarkdownRef.current,
            referenceDescription: visualRefDescRef.current,
          }}
          onConfirmar={handleConfirmarImagem}
        />
      )}
    </div>
  )
}
