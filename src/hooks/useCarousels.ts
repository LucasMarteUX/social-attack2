import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Carousel } from '../data/mock'

export function useCarousels() {
  const [carousels, setCarousels] = useState<Carousel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('carousels')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        setCarousels([])
        setError(null)
      } else {
        setCarousels(data ?? [])
      }
    } catch {
      setCarousels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados: Pick<Carousel, 'title' | 'description' | 'references_urls' | 'references_text' | 'total_slides' | 'design_system_id' | 'tone_of_voice_id'>) {
    const { data, error } = await supabase
      .from('carousels')
      .insert({ ...dados, status: 'draft', version: 1 })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const novo = data as Carousel
    setCarousels((prev) => [novo, ...prev])
    return novo
  }

  async function atualizarStatus(id: string, status: Carousel['status']) {
    const { data, error } = await supabase
      .from('carousels')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setCarousels((prev) => prev.map((c) => (c.id === id ? (data as Carousel) : c)))
  }

  async function novaVersao(id: string) {
    const original = carousels.find((c) => c.id === id)
    if (!original) throw new Error('Carrossel não encontrado')
    const { id: _, created_at: __, updated_at: ___, ...campos } = original
    const { data, error } = await supabase
      .from('carousels')
      .insert({ ...campos, status: 'draft', version: original.version + 1, parent_carousel_id: id })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const novo = data as Carousel
    setCarousels((prev) => [novo, ...prev])
    return novo
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('carousels').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setCarousels((prev) => prev.filter((c) => c.id !== id))
  }

  function getById(id: string) {
    return carousels.find((c) => c.id === id)
  }

  return { carousels, loading, error, criar, atualizarStatus, novaVersao, excluir, getById, recarregar: carregar }
}
