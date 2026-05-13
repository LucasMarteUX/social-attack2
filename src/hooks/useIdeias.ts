import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Ideia } from '../data/mock'

export function useIdeias(categoriaId: string) {
  const [ideias, setIdeias] = useState<Ideia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!categoriaId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ideias')
        .select('*, referencias(*)')
        .eq('categoria_id', categoriaId)
        .order('criado_em', { ascending: false })
      if (error) {
        setIdeias([])
        setError(null)
      } else {
        const ideiasMapped = (data ?? []).map((i: any) => ({
          ...i,
          referencias: (i.referencias ?? []).map((r: any) => ({ tipo: r.tipo, valor: r.valor })),
        }))
        setIdeias(ideiasMapped)
      }
    } catch {
      setIdeias([])
    } finally {
      setLoading(false)
    }
  }, [categoriaId])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados: Omit<Ideia, 'id' | 'criado_em' | 'categoria_id' | 'favorita' | 'conteudo_gerado'>) {
    const { data, error } = await supabase
      .from('ideias')
      .insert({ ...dados, categoria_id: categoriaId, favorita: false, conteudo_gerado: false, referencias: undefined })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const nova: Ideia = { ...data, referencias: [] }
    setIdeias((prev) => [nova, ...prev])
    return nova
  }

  async function editar(id: string, dados: Partial<Pick<Ideia, 'titulo' | 'descricao'>>) {
    const { data, error } = await supabase
      .from('ideias')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setIdeias((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)))
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('ideias').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setIdeias((prev) => prev.filter((i) => i.id !== id))
  }

  async function toggleFavorita(id: string) {
    const ideia = ideias.find((i) => i.id === id)
    if (!ideia) return
    const novoValor = !ideia.favorita
    const { error } = await supabase.from('ideias').update({ favorita: novoValor }).eq('id', id)
    if (error) throw new Error(error.message)
    setIdeias((prev) => prev.map((i) => (i.id === id ? { ...i, favorita: novoValor } : i)))
  }

  async function adicionarReferencia(ideiaId: string, ref: { tipo: 'url' | 'texto'; valor: string }) {
    const { data, error } = await supabase
      .from('referencias')
      .insert({ ...ref, ideia_id: ideiaId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setIdeias((prev) =>
      prev.map((i) =>
        i.id === ideiaId ? { ...i, referencias: [...i.referencias, { tipo: data.tipo, valor: data.valor }] } : i
      )
    )
  }

  async function removerReferencia(ideiaId: string, index: number) {
    const ideia = ideias.find((i) => i.id === ideiaId)
    if (!ideia) return
    const ref = ideia.referencias[index]
    const { data: refRow } = await supabase
      .from('referencias')
      .select('id')
      .eq('ideia_id', ideiaId)
      .eq('valor', ref.valor)
      .maybeSingle()
    if (refRow) {
      await supabase.from('referencias').delete().eq('id', refRow.id)
    }
    setIdeias((prev) =>
      prev.map((i) =>
        i.id === ideiaId ? { ...i, referencias: i.referencias.filter((_, idx) => idx !== index) } : i
      )
    )
  }

  return { ideias, loading, error, criar, editar, excluir, toggleFavorita, adicionarReferencia, removerReferencia }
}
