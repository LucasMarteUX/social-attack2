import { useState, useCallback, useRef } from 'react'
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
import { useCarousels } from '../hooks/useCarousels'
import { useCarouselSlides } from '../hooks/useCarouselSlides'
import { gerarRoteirosNodes, generateSlideImage } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import type { CarouselSlide, SlideStyles } from '../data/mock'
import { DEFAULT_SLIDE_STYLES } from '../data/mock'

const NODE_TYPES = { mainNode: MainNode, slideNode: SlideNode }

const MAIN_NODE_ID = 'main'
const MAIN_NODE_X = 0
const MAIN_NODE_Y = 0
const SLIDE_OFFSET_Y = 480
const SLIDE_GAP_X = 340

export default function WorkspacePage() {
  const { criar: criarCarousel, atualizarStatus } = useCarousels()

  const [carouselId, setCarouselId] = useState<string | null>(null)
  const { slides, inserirSlides, editarTexto, resetarTexto, atualizarImagem, atualizarTextoRegenerado, buscarHistorico } = useCarouselSlides(carouselId ?? '')

  const [slideStyles, setSlideStyles] = useState<SlideStyles>(DEFAULT_SLIDE_STYLES)
  // ref para acesso nas closures de refreshSlideNode sem ficar stale
  const slideStylesRef = useRef<SlideStyles>(DEFAULT_SLIDE_STYLES)

  const [, setGenerating] = useState(false)

  const [regenModal, setRegenModal] = useState<{ slideId: string; campo: string; textoAtual: string; slideType: string; historico: ReturnType<typeof buscarHistorico> extends Promise<infer T> ? T : never } | null>(null)
  const [regenHistorico, setRegenHistorico] = useState<{ id: string; new_value: string | null; created_at: string }[]>([])

  const [imageModal, setImageModal] = useState<{ slideId: string; promptInicial: string } | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: MAIN_NODE_ID,
      type: 'mainNode',
      position: { x: MAIN_NODE_X, y: MAIN_NODE_Y },
      data: { onGerar: handleGerar, gerating: false },
    },
  ])
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
    totalSlides: number
    autoGerarImagens: boolean
  }) {
    setGenerating(true)
    setNodes((nds) => nds.map((n) => n.id === MAIN_NODE_ID ? { ...n, data: { ...n.data, gerating: true } } : n))

    try {
      const carousel = await criarCarousel({
        title: params.titulo,
        description: params.descricao || null,
        references_urls: params.referencesUrls,
        references_text: params.referencesText || null,
        total_slides: params.totalSlides,
        design_system_id: params.designSystemId || null,
        tone_of_voice_id: params.tomId || null,
      })
      setCarouselId(carousel.id)
      await atualizarStatus(carousel.id, 'generating')

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

      // Salva estilos extraídos do design system
      const estilos = script.styles ?? DEFAULT_SLIDE_STYLES
      setSlideStyles(estilos)
      slideStylesRef.current = estilos

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
        is_text_edited: false,
        is_image_edited: false,
        regenerate_text_count: 0,
        regenerate_image_count: 0,
      }))

      const novosSlides = await inserirSlides(slidesParaInserir)
      await atualizarStatus(carousel.id, 'ready')

      renderizarSlideNodes(novosSlides, estilos)

      if (params.autoGerarImagens) {
        gerarImagensEmBackground(novosSlides, carousel.id).catch(console.error)
      }

    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
      setNodes((nds) => nds.map((n) => n.id === MAIN_NODE_ID ? { ...n, data: { ...n.data, gerating: false } } : n))
    }
  }

  async function gerarImagensEmBackground(slidesList: CarouselSlide[], cId: string) {
    // Marca todos os slides como "gerando imagem"
    setNodes((nds) => nds.map((n) => {
      if (!n.id.startsWith('slide-')) return n
      return { ...n, data: { ...n.data, imageGenerating: true } }
    }))

    await Promise.allSettled(
      slidesList.map(async (slide) => {
        const promptBase = [slide.headline, slide.body_paragraph, slide.cta_message, slide.tag_text]
          .filter(Boolean).join('. ')
        const prompt = `${promptBase}. Estilo editorial Instagram, proporção 4:5, sem texto na imagem, fotografia ou ilustração.`
        try {
          const dataUrl = await generateSlideImage(prompt)
          const path = `${cId}/${slide.id}/auto.jpg`
          const blob = dataURLtoBlob(dataUrl)
          const { data: storageData, error } = await supabase.storage
            .from('carousel-images')
            .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
          if (!error && storageData) {
            const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(storageData.path)
            await atualizarImagem(slide.id, urlData.publicUrl, 'generated', prompt)
          }
        } catch {
          // falha silenciosa por slide individual
        } finally {
          setNodes((nds) => nds.map((n) => {
            if (n.id !== `slide-${slide.id}`) return n
            return { ...n, data: { ...n.data, imageGenerating: false } }
          }))
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
      position: { x: startX + i * SLIDE_GAP_X, y: MAIN_NODE_Y + SLIDE_OFFSET_Y },
      data: buildSlideData(slide, estilos, slidesList.length),
    }))

    const novosEdges: Edge[] = slidesList.map((slide) => ({
      id: `edge-main-${slide.id}`,
      source: MAIN_NODE_ID,
      target: `slide-${slide.id}`,
      style: { stroke: '#6D28D9', strokeWidth: 1.5, opacity: 0.4 },
    }))

    setNodes((nds) => [nds.find((n) => n.id === MAIN_NODE_ID)!, ...novosNodes])
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
        const promptBase = [slide.headline, slide.body_paragraph, slide.cta_message].filter(Boolean).join('. ')
        setImageModal({ slideId, promptInicial: `${promptBase}. Estilo Instagram 4:5, sem texto na imagem.` })
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

  async function handleConfirmarImagem(imageDataUrl: string, prompt: string) {
    if (!imageModal) return
    await atualizarImagem(imageModal.slideId, imageDataUrl, 'generated', prompt)
    refreshSlideNode(imageModal.slideId)
  }

  return (
    <div className="w-full h-[calc(100vh-64px)]">
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

      {imageModal && (
        <GenerateImageModal
          open={!!imageModal}
          onClose={() => setImageModal(null)}
          promptInicial={imageModal.promptInicial}
          onConfirmar={handleConfirmarImagem}
        />
      )}
    </div>
  )
}
