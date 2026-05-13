import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TomDeVoz } from '../data/mock'

export function useTomDeVoz() {
  const [tons, setTons] = useState<TomDeVoz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tons_de_voz')
        .select('*')
        .order('criado_em', { ascending: true })
      if (error) {
        setTons([])
        setError(null)
      } else {
        setTons(data ?? [])
      }
    } catch {
      setTons([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados: Omit<TomDeVoz, 'id' | 'criado_em'>) {
    const { data, error } = await supabase
      .from('tons_de_voz')
      .insert(dados)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTons((prev) => [...prev, data as TomDeVoz])
  }

  async function editar(id: string, dados: Omit<TomDeVoz, 'id' | 'criado_em'>) {
    const { data, error } = await supabase
      .from('tons_de_voz')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTons((prev) => prev.map((t) => (t.id === id ? (data as TomDeVoz) : t)))
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('tons_de_voz').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setTons((prev) => prev.filter((t) => t.id !== id))
  }

  return { tons, loading, error, criar, editar, excluir }
}
