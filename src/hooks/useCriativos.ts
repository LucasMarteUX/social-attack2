import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Criativo, Categoria } from '../data/mock'

export function useCriativos() {
  const [criativos, setCriativos] = useState<Criativo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: criData, error: criError }, { data: catData }] = await Promise.all([
      supabase.from('criativos').select('*, slides(*)').order('criado_em', { ascending: false }),
      supabase.from('categorias').select('*'),
    ])
    if (criError) setError(criError.message)
    else {
      const mapped = (criData ?? []).map((c: any) => ({
        ...c,
        slides: (c.slides ?? []).sort((a: any, b: any) => a.numero - b.numero),
        referencias: [],
      }))
      setCriativos(mapped)
    }
    setCategorias(catData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados: { titulo: string; tipo: Criativo['tipo']; categoria_id: string; ideia_id?: string; tom_de_voz_id?: string }) {
    const { data, error } = await supabase
      .from('criativos')
      .insert({ ...dados, status: 'rascunho', hashtags: [], slides: undefined })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const novo: Criativo = { ...data, slides: [], referencias: [] }
    setCriativos((prev) => [novo, ...prev])
    return novo
  }

  async function salvarComSlides(
    criativoId: string,
    dados: Partial<Pick<Criativo, 'titulo' | 'legenda' | 'hashtags' | 'status'>>,
    slidesList: { numero: number; texto: string }[]
  ) {
    const { data, error } = await supabase
      .from('criativos')
      .update(dados)
      .eq('id', criativoId)
      .select()
      .single()
    if (error) throw new Error(error.message)

    if (slidesList.length > 0) {
      await supabase.from('slides').delete().eq('criativo_id', criativoId)
      const { error: slideError } = await supabase.from('slides').insert(
        slidesList.map((s) => ({ numero: s.numero, texto: s.texto, criativo_id: criativoId }))
      )
      if (slideError) throw new Error(slideError.message)
    }

    await carregar()
    return data as Criativo
  }

  async function editar(id: string, dados: Partial<Omit<Criativo, 'id' | 'criado_em'>>) {
    const { slides: _, ...rest } = dados as any
    const { data, error } = await supabase
      .from('criativos')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setCriativos((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('criativos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setCriativos((prev) => prev.filter((c) => c.id !== id))
  }

  function getById(id: string) {
    return criativos.find((c) => c.id === id)
  }

  function getCategoria(categoriaId: string) {
    return categorias.find((c) => c.id === categoriaId)
  }

  return { criativos, categorias, loading, error, criar, salvarComSlides, editar, excluir, getById, getCategoria }
}
