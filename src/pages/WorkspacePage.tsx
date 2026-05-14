import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useNodes,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import MainNode, { type MainNodeData } from '../components/nodes/MainNode'
import SlideNode, { type SlideNodeData } from '../components/nodes/SlideNode'
import RegenerateTextModal from '../components/modals/RegenerateTextModal'
import GenerateImageModal from '../components/modals/GenerateImageModal'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { useCarousels } from '../hooks/useCarousels'
import { useCarouselSlides } from '../hooks/useCarouselSlides'
import { useDesignSystems } from '../hooks/useDesignSystems'
import { useTomDeVoz } from '../hooks/useTomDeVoz'
import {
  gerarConteudoSlides,
  extrairSlideStylesDoDesignSystem,
  compactarDesignSystemParaBriefVisual,
  gerarSlideCompleto,
  gerarVariacaoFundoSlide,
  montarPromptImagemSlide,
  analisarReferenciasVisuais,
  carouselSlideToNodeSlide,
  type CarouselImagePromptContext,
  type GeminiImageInlinePart,
} from '../lib/gemini'
import { supabase } from '../lib/supabase'
import type { CarouselSlide, SlideStyles } from '../data/mock'
import { DEFAULT_SLIDE_STYLES, PLACEHOLDER_TEXTO_SLIDE_GERANDO } from '../data/mock'

const NODE_TYPES = { mainNode: MainNode, slideNode: SlideNode }

const MAIN_NODE_ID = 'main'
const MAIN_NODE_X = 0   // centro de referência horizontal
const MAIN_NODE_Y = 0
const MAIN_NODE_WIDTH = 380
const SLIDE_NODE_WIDTH = 300
const SLIDE_OFFSET_Y = 920  // gap seguro acima dos slides (MainNode ~650px + folga)
const SLIDE_GAP_X = 360     // largura do slide + margem lateral

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

function buildCarouselStubSlides(
  carouselId: string,
  totalSlides: number
): Omit<CarouselSlide, 'id' | 'created_at' | 'updated_at'>[] {
  const ph = PLACEHOLDER_TEXTO_SLIDE_GERANDO
  return Array.from({ length: totalSlides }, (_, idx) => {
    const slide_number = idx + 1
    const slide_type: CarouselSlide['slide_type'] =
      slide_number === 1 ? 'cover' : slide_number === totalSlides ? 'cta' : 'body'
    return {
      carousel_id: carouselId,
      slide_number,
      slide_type,
      tag_text: slide_type === 'cover' ? ph : null,
      headline: slide_type === 'cta' ? null : ph,
      subheadline: slide_type === 'cover' ? ph : null,
      body_paragraph: slide_type === 'body' ? ph : null,
      cta_message: slide_type === 'cta' ? ph : null,
      original_tag_text: slide_type === 'cover' ? ph : null,
      original_headline: slide_type === 'cta' ? null : ph,
      original_subheadline: slide_type === 'cover' ? ph : null,
      original_body_paragraph: slide_type === 'body' ? ph : null,
      original_cta_message: slide_type === 'cta' ? ph : null,
      image_url: null,
      image_source: 'none',
      image_generation_prompt: null,
      image_is_full_composition: false,
      is_text_edited: false,
      is_image_edited: false,
      regenerate_text_count: 0,
      regenerate_image_count: 0,
    }
  })
}

type GerarParams = Parameters<MainNodeData['onGerar']>[0]

// Renderizado dentro do SVG do MiniMap — usa useNodes para acessar image_url de cada slide
function MiniMapNodePreview({ x, y, width, height, id }: { x: number; y: number; width: number; height: number; id: string }) {
  const nodes = useNodes<Node>()
  const node = nodes.find((n) => n.id === id)

  if (node?.type === 'slideNode') {
    const data = node.data as unknown as SlideNodeData
    const imgUrl = data?.slide?.image_url
    const bg = (data?.styles ?? DEFAULT_SLIDE_STYLES).backgroundColor
    return (
      <>
        <rect x={x} y={y} width={width} height={height} fill={bg} rx={2} />
        {imgUrl ? (
          <image href={imgUrl} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <rect x={x} y={y} width={width} height={height} fill={bg} stroke="#6D28D9" strokeWidth={1} rx={2} />
        )}
      </>
    )
  }

  return <rect x={x} y={y} width={width} height={height} fill="#6D28D9" rx={3} />
}

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'novo'

  const { criar: criarCarousel, atualizarStatus, getById, carousels } = useCarousels()
  const { designSystems } = useDesignSystems()
  const { tons } = useTomDeVoz()

  const [carouselId, setCarouselId] = useState<string | null>(isNew ? null : (id ?? null))
  const { slides, loading: slidesLoading, inserirSlides, editarTexto, resetarTexto, atualizarImagem, atualizarTextoRegenerado, aplicarTextoGerado, definirPromptGeracao, buscarHistorico } = useCarouselSlides(carouselId ?? '')

  const [, setSlideStyles] = useState<SlideStyles>(DEFAULT_SLIDE_STYLES)
  const slideStylesRef = useRef<SlideStyles>(DEFAULT_SLIDE_STYLES)
  const slidesInitialized = useRef(false)
  const visualBriefRef = useRef('')
  const visualRefDescRef = useRef('')

  const [, setGenerating] = useState(false)
  const [regenModal, setRegenModal] = useState<{ slideId: string; campo: string; textoAtual: string; slideType: string; historico: ReturnType<typeof buscarHistorico> extends Promise<infer T> ? T : never } | null>(null)
  const [regenHistorico, setRegenHistorico] = useState<{ id: string; new_value: string | null; created_at: string }[]>([])
  const [imageModal, setImageModal] = useState<{ slideId: string } | null>(null)
  const [slidePendingVariants, setSlidePendingVariants] = useState<
    Record<string, { id: string; url: string; prompt: string }[]>
  >({})
  const slidePendingVariantsRef = useRef(slidePendingVariants)
  slidePendingVariantsRef.current = slidePendingVariants
  const handleGerarRef = useRef<(p: GerarParams) => Promise<void>>(async () => {
    throw new Error('Workspace ainda não está pronto.')
  })
  const [geracaoErro, setGeracaoErro] = useState<string | null>(null)
  const [avisoImagens, setAvisoImagens] = useState<string | null>(null)
  const geracaoLockRef = useRef(false)

  useEffect(() => {
    if (!isNew && id) setCarouselId(id)
  }, [id, isNew])

  useEffect(() => {
    slidesInitialized.current = false
  }, [carouselId])

  useEffect(() => {
    let cancelled = false
    async function syncDsContext() {
      if (!carouselId || isNew) return
      const car = carousels.find((c) => c.id === carouselId)
      const dsId = car?.design_system_id
      if (!dsId) {
        visualBriefRef.current = ''
        visualRefDescRef.current = ''
        return
      }
      const ds = designSystems.find((d) => d.id === dsId)
      if (!ds) {
        visualBriefRef.current = ''
        visualRefDescRef.current = ''
        return
      }
      const md = ds.markdown ?? ''
      if (!md.trim()) {
        visualBriefRef.current = ''
      } else {
        try {
          visualBriefRef.current = await compactarDesignSystemParaBriefVisual(md)
        } catch {
          visualBriefRef.current = ''
        }
      }
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

  function buildMainNodeData(): MainNodeData {
    const car = carouselId ? getById(carouselId) : null
    const prefill =
      car && !isNew
        ? {
            titulo: car.title,
            descricao: car.description ?? '',
            referencesUrls: [...(car.references_urls ?? [])],
            referencesText: car.references_text ?? '',
            tomId: car.tone_of_voice_id ?? '',
            designSystemId: car.design_system_id ?? '',
            totalSlides: car.total_slides,
          }
        : undefined
    return {
      onGerar: async (p: GerarParams) => handleGerarRef.current(p),
      gerating: false,
      geracaoErro,
      prefillKey: carouselId ?? 'novo',
      prefill,
    }
  }

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    isNew ? [{
      id: MAIN_NODE_ID,
      type: 'mainNode',
      position: { x: MAIN_NODE_X - MAIN_NODE_WIDTH / 2, y: MAIN_NODE_Y },
      data: buildMainNodeData() as unknown as Record<string, unknown>,
    }] : []
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  useEffect(() => {
    setNodes((nds) =>
      nds.some((n) => n.id === MAIN_NODE_ID)
        ? nds.map((n) =>
            n.id === MAIN_NODE_ID ? { ...n, data: { ...(n.data as unknown as MainNodeData), geracaoErro } as Record<string, unknown> } : n
          )
        : nds
    )
  }, [geracaoErro, setNodes])

  useEffect(() => {
    if (isNew || !carouselId) return
    const car = getById(carouselId)
    if (!car) return
    setNodes((nds) =>
      nds.some((n) => n.id === MAIN_NODE_ID)
        ? nds.map((n) =>
            n.id === MAIN_NODE_ID
              ? {
                  ...n,
                  data: {
                    ...(n.data as unknown as MainNodeData),
                    prefillKey: carouselId,
                    prefill: {
                      titulo: car.title,
                      descricao: car.description ?? '',
                      referencesUrls: [...(car.references_urls ?? [])],
                      referencesText: car.references_text ?? '',
                      tomId: car.tone_of_voice_id ?? '',
                      designSystemId: car.design_system_id ?? '',
                      totalSlides: car.total_slides,
                    },
                  } as Record<string, unknown>,
                }
              : n
          )
        : nds
    )
  }, [carouselId, isNew, carousels]) // eslint-disable-line

  function montarContextoCarrosselParaImagem(): CarouselImagePromptContext | null {
    if (!carouselId) return null
    const car = getById(carouselId)
    if (!car) return null
    const tom = tons.find((t) => t.id === car.tone_of_voice_id)
    return {
      titulo: car.title,
      descricao: car.description ?? '',
      referencesUrls: [...(car.references_urls ?? [])],
      referencesText: car.references_text ?? '',
      tomNome: tom?.nome ?? '',
      tomDescricao: tom?.descricao ?? '',
    }
  }

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
    capaPromptFundo?: string
    capaReferenceInlineParts?: GeminiImageInlinePart[]
  }) {
    if (geracaoLockRef.current) return
    geracaoLockRef.current = true
    setGeracaoErro(null)
    setAvisoImagens(null)
    setGenerating(true)
    setNodes((nds) => nds.map((n) => n.id === MAIN_NODE_ID ? { ...n, data: { ...n.data, gerating: true } } : n))

    try {
      const partialStyles = params.designSystemMarkdown.trim()
        ? await extrairSlideStylesDoDesignSystem(params.designSystemMarkdown)
        : {}
      const estilos: SlideStyles = { ...DEFAULT_SLIDE_STYLES, ...partialStyles }
      setSlideStyles(estilos)
      slideStylesRef.current = estilos

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

      const stubs = buildCarouselStubSlides(carousel.id, params.totalSlides)
      const novosSlides = await inserirSlides(stubs)

      renderizarSlideNodes(novosSlides, estilos)
      slidesInitialized.current = true

      navigate(`/workspace/${carousel.id}`, { replace: true })

      const refUrls = params.designSystemReferenceUrls ?? []
      const [contentSlides, visualBrief, referenceDescription] = await Promise.all([
        gerarConteudoSlides({
          titulo: params.titulo,
          descricao: params.descricao,
          referencesUrls: params.referencesUrls,
          referencesText: params.referencesText,
          tomNome: params.tomNome,
          tomDescricao: params.tomDescricao,
          totalSlides: params.totalSlides,
        }),
        params.designSystemMarkdown.trim()
          ? compactarDesignSystemParaBriefVisual(params.designSystemMarkdown).catch(() => '')
          : Promise.resolve(''),
        refUrls.length ? analisarReferenciasVisuais(refUrls).catch(() => '') : Promise.resolve(''),
      ])

      visualBriefRef.current = visualBrief
      visualRefDescRef.current = referenceDescription

      const ordered = [...novosSlides].sort((a, b) => a.slide_number - b.slide_number)
      const byNumber = new Map(contentSlides.map((s) => [s.slide_number, s]))
      let slidesForBatch: CarouselSlide[] = []

      for (const row of ordered) {
        const gen = byNumber.get(row.slide_number)
        if (!gen) {
          slidesForBatch.push(row)
          continue
        }
        const atualizado = await aplicarTextoGerado(row.id, {
          tag_text: gen.tag_text ?? null,
          headline: gen.headline ?? null,
          subheadline: gen.subheadline ?? null,
          body_paragraph: gen.body_paragraph ?? null,
          cta_message: gen.cta_message ?? null,
        })
        slidesForBatch.push(atualizado ?? row)
        if (atualizado) refreshSlideNode(row.id, atualizado)
      }

      const capaExplicit =
        Boolean(params.capaPromptFundo?.trim()) ||
        (params.capaReferenceInlineParts?.length ?? 0) > 0

      if (capaExplicit) {
        const cover = slidesForBatch.find((s) => s.slide_number === 1)
        if (cover) {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id !== `slide-${cover.id}`) return n
              const d = n.data as unknown as SlideNodeData
              return { ...n, data: { ...d, imageGenerating: true } }
            })
          )
          try {
            const node = carouselSlideToNodeSlide(cover)
            const histCapa = [
              'Capa — node principal',
              params.capaPromptFundo?.trim(),
              params.capaReferenceInlineParts?.length
                ? `${params.capaReferenceInlineParts.length} ref(s)`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
            const dataUrl = await gerarSlideCompleto({
              slide: node,
              totalSlides: params.totalSlides,
              styles: estilos,
              visualBrief: visualBrief.trim() || undefined,
              referenceDescription,
              narrativaVisual: params.capaPromptFundo?.trim() || undefined,
              referenceInlineParts: params.capaReferenceInlineParts,
            })
            const path = `${carousel.id}/${cover.id}/cover-main-${Date.now()}.png`
            const blob = dataURLtoBlob(dataUrl)
            const { data: storageData, error: upErr } = await supabase.storage
              .from('carousel-images')
              .upload(path, blob, { upsert: true, contentType: blob.type || 'image/png' })
            if (!upErr && storageData) {
              const { data: urlData } = supabase.storage
                .from('carousel-images')
                .getPublicUrl(storageData.path)
              const atualizadoCapa = await atualizarImagem(
                cover.id,
                urlData.publicUrl,
                'generated',
                histCapa,
                true
              )
              if (atualizadoCapa) {
                slidesForBatch = slidesForBatch.map((s) =>
                  s.id === cover.id ? atualizadoCapa : s
                )
                refreshSlideNode(cover.id, atualizadoCapa)
              }
            } else if (upErr) console.error('Upload capa node principal:', upErr.message)
          } catch (err) {
            console.error('Geração capa node principal', err)
          } finally {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id !== `slide-${cover.id}`) return n
                const d = n.data as unknown as SlideNodeData
                return { ...n, data: { ...d, imageGenerating: false } }
              })
            )
          }
        }
      }

      await atualizarStatus(carousel.id, 'ready')

      if (params.autoGerarImagens) {
        const carouselPromptCtx: CarouselImagePromptContext = {
          titulo: params.titulo,
          descricao: params.descricao,
          referencesUrls: params.referencesUrls,
          referencesText: params.referencesText,
          tomNome: params.tomNome,
          tomDescricao: params.tomDescricao,
        }
        void gerarImagensEmBackground(slidesForBatch, carousel.id, {
          styles: estilos,
          visualBrief,
          referenceDescription,
          carousel: carouselPromptCtx,
          referenceImageUrls: refUrls,
          skipSlideNumbers: capaExplicit ? [1] : undefined,
        }).catch((e) => {
          console.error(e)
          setAvisoImagens(e instanceof Error ? e.message : 'Falha ao gerar imagens em segundo plano.')
        })
      }

    } catch (e) {
      console.error(e)
      setGeracaoErro(e instanceof Error ? e.message : 'Não foi possível gerar o carrossel.')
    } finally {
      geracaoLockRef.current = false
      setGenerating(false)
      setNodes((nds) => nds.map((n) => n.id === MAIN_NODE_ID ? { ...n, data: { ...n.data, gerating: false } } : n))
    }
  }

  handleGerarRef.current = handleGerar

  async function gerarImagensEmBackground(
    slidesList: CarouselSlide[],
    cId: string,
    ctx: {
      styles: SlideStyles
      visualBrief: string
      referenceDescription: string
      carousel: CarouselImagePromptContext
      referenceImageUrls: string[]
      skipSlideNumbers?: number[]
    }
  ) {
    const todosNodes = slidesList.map(carouselSlideToNodeSlide)
    let falhas = 0
    for (const slide of slidesList) {
      if (ctx.skipSlideNumbers?.includes(slide.slide_number)) continue
      let atualizado: CarouselSlide | null = null
      setNodes((nds) =>
        nds.map((n) =>
          n.id === `slide-${slide.id}` ? { ...n, data: { ...n.data, imageGenerating: true } } : n
        )
      )
      try {
        const node = carouselSlideToNodeSlide(slide)
        let narrativa = ''
        try {
          narrativa = await montarPromptImagemSlide({
            carousel: ctx.carousel,
            todosSlides: todosNodes,
            slideAtual: node,
            totalSlides: slidesList.length,
            styles: ctx.styles,
            visualBrief: ctx.visualBrief.trim() || undefined,
            referenceDescription: ctx.referenceDescription,
            referenceImageUrls: ctx.referenceImageUrls,
          })
        } catch (err) {
          console.error('montarPromptImagemSlide', slide.slide_number, err)
        }
        const narrativaTrim = narrativa.trim()
        if (narrativaTrim) {
          try {
            await definirPromptGeracao(slide.id, narrativaTrim)
          } catch (err) {
            console.error('definirPromptGeracao', slide.slide_number, err)
          }
        }
        const dataUrl = await gerarSlideCompleto({
          slide: node,
          totalSlides: slidesList.length,
          styles: ctx.styles,
          visualBrief: ctx.visualBrief.trim() || undefined,
          referenceDescription: ctx.referenceDescription,
          narrativaVisual: narrativaTrim || undefined,
        })
        const path = `${cId}/${slide.id}/full-${slide.slide_number}.png`
        const blob = dataURLtoBlob(dataUrl)
        const { data: storageData, error } = await supabase.storage
          .from('carousel-images')
          .upload(path, blob, { upsert: true, contentType: blob.type || 'image/png' })
        if (!error && storageData) {
          const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(storageData.path)
          atualizado = await atualizarImagem(
            slide.id,
            urlData.publicUrl,
            'generated',
            narrativaTrim || 'Post completo (texto + layout via IA)',
            true
          )
        } else {
          if (error) console.error('Upload arte:', error.message)
          falhas++
        }
      } catch (e) {
        console.error('Geração arte slide', slide.slide_number, e)
        falhas++
      } finally {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== `slide-${slide.id}`) return n
            const d = n.data as unknown as SlideNodeData
            return {
              ...n,
              data: {
                ...d,
                imageGenerating: false,
                ...(atualizado ? { slide: atualizado } : {}),
              },
            }
          })
        )
        if (!atualizado) refreshSlideNode(slide.id)
      }
    }

    if (falhas > 0) {
      setAvisoImagens(
        `${falhas} slide(s) sem imagem gerada (Imagen ou Storage). Verifique VITE_GEMINI_API_KEY, faturamento na Google AI e políticas do bucket carousel-images.`
      )
    }
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
    // Centraliza slides sob o node principal
    const totalSlidesWidth = slidesList.length * SLIDE_NODE_WIDTH + (slidesList.length - 1) * (SLIDE_GAP_X - SLIDE_NODE_WIDTH)
    const startX = MAIN_NODE_X - totalSlidesWidth / 2

    const mainNode: Node = {
      id: MAIN_NODE_ID,
      type: 'mainNode',
      position: { x: MAIN_NODE_X - MAIN_NODE_WIDTH / 2, y: MAIN_NODE_Y },
      data: buildMainNodeData() as unknown as Record<string, unknown>,
    }

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

    setNodes([mainNode, ...novosNodes])
    setEdges(novosEdges)
  }

  function buildSlideData(slide: CarouselSlide, estilos: SlideStyles, total: number) {
    const pending = slidePendingVariantsRef.current[slide.id] ?? []
    return {
      slide,
      styles: estilos,
      totalSlides: total,
      pendingImageVariants: pending,
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
      onUsarVarianteImagem: async (slideId: string, variant: { id: string; url: string; prompt: string }) => {
        await atualizarImagem(slideId, variant.url, 'generated', variant.prompt, true)
        setSlidePendingVariants((prev) => {
          const next = {
            ...prev,
            [slideId]: (prev[slideId] ?? []).filter((v) => v.id !== variant.id),
          }
          slidePendingVariantsRef.current = next
          return next
        })
        refreshSlideNode(slideId)
      },
      onDescartarVarianteImagem: (slideId: string, variantId: string) => {
        setSlidePendingVariants((prev) => {
          const next = {
            ...prev,
            [slideId]: (prev[slideId] ?? []).filter((v) => v.id !== variantId),
          }
          slidePendingVariantsRef.current = next
          return next
        })
        refreshSlideNode(slideId)
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

  function refreshSlideNode(slideId: string, slideOverride?: CarouselSlide) {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== `slide-${slideId}`) return n
        const slideAtualizado = slideOverride ?? slides.find((s) => s.id === slideId)
        if (!slideAtualizado) return n
        const totalSlidesNodes = nds.filter((x) => x.id.startsWith('slide-')).length
        const total = slides.length > 0 ? slides.length : totalSlidesNodes
        return { ...n, data: buildSlideData(slideAtualizado, slideStylesRef.current, total) }
      })
    )
  }

  async function handleIniciarVariacaoFundo(payload: {
    slideId: string
    narrativaVisual: string
    referenceInlineParts?: GeminiImageInlinePart[]
  }) {
    const { slideId, narrativaVisual, referenceInlineParts } = payload
    if (!carouselId) return

    const slide = slides.find((s) => s.id === slideId)
    if (!slide) return

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== `slide-${slideId}`) return n
        const d = n.data as unknown as SlideNodeData
        return { ...n, data: { ...d, imageGenerating: true } }
      })
    )

    try {
      const node = carouselSlideToNodeSlide(slide)
      const dataUrl = await gerarVariacaoFundoSlide({
        slide: node,
        totalSlides: slides.length,
        styles: slideStylesRef.current,
        visualBrief: visualBriefRef.current.trim() || undefined,
        referenceDescription: visualRefDescRef.current,
        narrativaVisual: narrativaVisual.trim() || undefined,
        referenceInlineParts,
        baseSlideImageUrl: slide.image_url,
      })
      const histPrompt = [
        'Variação de fundo',
        referenceInlineParts?.length ? `${referenceInlineParts.length} ref(s)` : null,
        narrativaVisual.trim().slice(0, 400),
      ]
        .filter(Boolean)
        .join(' · ')
      const path = `${carouselId}/${slideId}/var-${Date.now()}.png`
      const blob = dataURLtoBlob(dataUrl)
      const { data: storageData, error } = await supabase.storage
        .from('carousel-images')
        .upload(path, blob, { upsert: true, contentType: blob.type || 'image/png' })
      if (error) throw new Error(error.message)
      const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(storageData.path)
      const vid = crypto.randomUUID()
      const newVar = { id: vid, url: urlData.publicUrl, prompt: histPrompt }
      setSlidePendingVariants((prev) => {
        const next = { ...prev, [slideId]: [...(prev[slideId] ?? []), newVar] }
        slidePendingVariantsRef.current = next
        return next
      })
      refreshSlideNode(slideId)
    } catch (e) {
      console.error(e)
      setAvisoImagens(e instanceof Error ? e.message : 'Falha ao gerar variação de fundo.')
    } finally {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== `slide-${slideId}`) return n
          const d = n.data as unknown as SlideNodeData
          return { ...n, data: { ...d, imageGenerating: false } }
        })
      )
    }
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

  const carouselInfo = !isNew && carouselId ? getById(carouselId) : null

  const designSystemRefImageUrls = useMemo(() => {
    if (!carouselId) return [] as string[]
    const car = carousels.find((c) => c.id === carouselId)
    if (!car?.design_system_id) return []
    const ds = designSystems.find((d) => d.id === car.design_system_id)
    return [...(ds?.reference_image_urls ?? [])]
  }, [carouselId, carousels, designSystems])

  const modalSlide = imageModal ? slides.find((s) => s.id === imageModal.slideId) : undefined
  const carouselCtxModal = montarContextoCarrosselParaImagem()

  return (
    <div className="w-full h-[calc(100vh-64px)] relative">

      {avisoImagens && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] max-w-lg w-[calc(100%-2rem)] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-md flex gap-3 items-start">
          <p className="text-[12px] text-amber-950 leading-snug flex-1">{avisoImagens}</p>
          <button
            type="button"
            onClick={() => setAvisoImagens(null)}
            className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

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
        <MiniMap
          nodeComponent={MiniMapNodePreview}
          maskColor="rgba(0,0,0,0.06)"
          style={{ background: '#f5f3f0' }}
        />
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

      {imageModal && modalSlide && carouselCtxModal && (
        <GenerateImageModal
          open
          onClose={() => setImageModal(null)}
          variant="full_slide"
          fullSlide={{
            slide: modalSlide,
            styles: slideStylesRef.current,
            carousel: carouselCtxModal,
            allSlides: slides.map(carouselSlideToNodeSlide),
            visualBrief: visualBriefRef.current || undefined,
            referenceDescription: visualRefDescRef.current,
            referenceImageUrls: designSystemRefImageUrls,
          }}
          onIniciarVariacaoFundo={handleIniciarVariacaoFundo}
        />
      )}
    </div>
  )
}
