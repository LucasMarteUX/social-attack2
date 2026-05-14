import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CarouselSlide, SlideActionType } from '../data/mock'

export function useCarouselSlides(carouselId: string) {
  const [slides, setSlides] = useState<CarouselSlide[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    if (!carouselId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('carousel_slides')
        .select('*')
        .eq('carousel_id', carouselId)
        .order('slide_number', { ascending: true })
      if (!error && data) {
        setSlides(
          data.map((row) => ({
            ...(row as CarouselSlide),
            image_is_full_composition: Boolean((row as CarouselSlide).image_is_full_composition),
          }))
        )
      } else {
        setSlides([])
      }
    } catch {
      setSlides([])
    } finally {
      setLoading(false)
    }
  }, [carouselId])

  useEffect(() => { carregar() }, [carregar])

  async function inserirSlides(lista: Omit<CarouselSlide, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
      .from('carousel_slides')
      .insert(lista)
      .select()
    if (error) throw new Error(error.message)
    const novos = (data ?? []) as CarouselSlide[]
    setSlides(novos.sort((a, b) => a.slide_number - b.slide_number))
    return novos
  }

  async function editarTexto(
    slideId: string,
    campo: keyof Pick<CarouselSlide, 'tag_text' | 'headline' | 'subheadline' | 'body_paragraph' | 'cta_message'>,
    novoValor: string
  ) {
    const slide = slides.find((s) => s.id === slideId)
    if (!slide) return

    const oldValue = slide[campo] ?? ''
    const { data, error } = await supabase
      .from('carousel_slides')
      .update({ [campo]: novoValor, is_text_edited: true })
      .eq('id', slideId)
      .select()
      .single()
    if (error) throw new Error(error.message)

    setSlides((prev) => prev.map((s) => (s.id === slideId ? (data as CarouselSlide) : s)))
    await registrarHistorico(slideId, 'text_manual_edit', campo, oldValue, novoValor)
  }

  async function resetarTexto(slideId: string) {
    const slide = slides.find((s) => s.id === slideId)
    if (!slide) return

    const { data, error } = await supabase
      .from('carousel_slides')
      .update({
        tag_text: slide.original_tag_text,
        headline: slide.original_headline,
        subheadline: slide.original_subheadline,
        body_paragraph: slide.original_body_paragraph,
        cta_message: slide.original_cta_message,
        is_text_edited: false,
      })
      .eq('id', slideId)
      .select()
      .single()
    if (error) throw new Error(error.message)

    setSlides((prev) => prev.map((s) => (s.id === slideId ? (data as CarouselSlide) : s)))
    await registrarHistorico(slideId, 'text_reset', null, null, null)
  }

  async function atualizarImagem(
    slideId: string,
    imageUrl: string | null,
    imageSource: CarouselSlide['image_source'],
    prompt?: string,
    imageIsFullComposition?: boolean
  ): Promise<CarouselSlide | null> {
    const actionType: SlideActionType = imageUrl === null
      ? 'image_removed'
      : imageSource === 'uploaded'
      ? 'image_uploaded'
      : 'image_generated'

    const compositionFlag =
      imageUrl === null ? false : imageSource === 'generated' ? Boolean(imageIsFullComposition) : false

    const { data, error } = await supabase
      .from('carousel_slides')
      .update({
        image_url: imageUrl,
        image_source: imageSource,
        image_generation_prompt: prompt ?? null,
        image_is_full_composition: compositionFlag,
        is_image_edited: imageUrl !== null,
        ...(imageSource === 'generated' ? { regenerate_image_count: (slides.find((s) => s.id === slideId)?.regenerate_image_count ?? 0) + 1 } : {}),
      })
      .eq('id', slideId)
      .select()
      .single()
    if (error) throw new Error(error.message)

    const updated = data as CarouselSlide
    setSlides((prev) => prev.map((s) => (s.id === slideId ? updated : s)))
    await registrarHistorico(slideId, actionType, 'image_url', null, imageUrl, prompt)
    return updated
  }

  async function atualizarTextoRegenerado(
    slideId: string,
    campo: keyof Pick<CarouselSlide, 'tag_text' | 'headline' | 'subheadline' | 'body_paragraph' | 'cta_message'>,
    novoValor: string,
    promptUsado?: string
  ) {
    const slide = slides.find((s) => s.id === slideId)
    if (!slide) return

    const oldValue = slide[campo] ?? ''
    const { data, error } = await supabase
      .from('carousel_slides')
      .update({
        [campo]: novoValor,
        is_text_edited: true,
        regenerate_text_count: slide.regenerate_text_count + 1,
      })
      .eq('id', slideId)
      .select()
      .single()
    if (error) throw new Error(error.message)

    setSlides((prev) => prev.map((s) => (s.id === slideId ? (data as CarouselSlide) : s)))
    await registrarHistorico(slideId, 'text_regenerated', campo, oldValue, novoValor, promptUsado)
  }

  async function registrarHistorico(
    slideId: string,
    actionType: SlideActionType,
    fieldChanged: string | null,
    oldValue: string | null,
    newValue: string | null,
    promptUsed?: string
  ) {
    await supabase.from('slide_edit_history').insert({
      slide_id: slideId,
      action_type: actionType,
      field_changed: fieldChanged,
      old_value: oldValue,
      new_value: newValue,
      prompt_used: promptUsed ?? null,
    })
  }

  async function buscarHistorico(slideId: string, limite = 3) {
    const { data } = await supabase
      .from('slide_edit_history')
      .select('*')
      .eq('slide_id', slideId)
      .eq('action_type', 'text_regenerated')
      .order('created_at', { ascending: false })
      .limit(limite)
    return data ?? []
  }

  return {
    slides,
    loading,
    inserirSlides,
    editarTexto,
    resetarTexto,
    atualizarImagem,
    atualizarTextoRegenerado,
    buscarHistorico,
    recarregar: carregar,
  }
}
