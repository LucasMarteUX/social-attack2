import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Agendamento, Criativo, Categoria } from '../data/mock'

interface AgendamentoComRelacoes extends Agendamento {
  criativo?: Criativo & { categoria?: Categoria }
}

export function useAgenda() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoComRelacoes[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, criativo:criativos(*, categoria:categorias(*))')
        .order('data_publicacao', { ascending: true })
      if (error) {
        setAgendamentos([])
        setError(null)
      } else {
        setAgendamentos(data ?? [])
      }
    } catch {
      setAgendamentos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados: Omit<Agendamento, 'id'>) {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert(dados)
      .select('*, criativo:criativos(*, categoria:categorias(*))')
      .single()
    if (error) throw new Error(error.message)
    setAgendamentos((prev) => [...prev, data])
    return data as AgendamentoComRelacoes
  }

  async function editar(id: string, dados: Partial<Agendamento>) {
    const { data, error } = await supabase
      .from('agendamentos')
      .update(dados)
      .eq('id', id)
      .select('*, criativo:criativos(*, categoria:categorias(*))')
      .single()
    if (error) throw new Error(error.message)
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? (data as AgendamentoComRelacoes) : a)))
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setAgendamentos((prev) => prev.filter((a) => a.id !== id))
  }

  function getCriativo(criativoId: string) {
    return agendamentos.find((a) => a.criativo_id === criativoId)?.criativo
  }

  function getCategoriaByCriativo(criativoId: string) {
    const ag = agendamentos.find((a) => a.criativo_id === criativoId)
    return ag?.criativo?.categoria ?? null
  }

  return { agendamentos, loading, error, criar, editar, excluir, getCriativo, getCategoriaByCriativo }
}
