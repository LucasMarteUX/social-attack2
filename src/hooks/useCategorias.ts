import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Categoria } from '../data/mock'

interface CategoriaStats {
  ideias: number
  criativos: number
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [stats, setStats] = useState<Record<string, CategoriaStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('criado_em', { ascending: false })
      if (error) {
        setCategorias([])
        setError(null)
        return
      }
      const cats = data ?? []
      setCategorias(cats)
      const statsMap: Record<string, CategoriaStats> = {}
      await Promise.all(cats.map(async (cat: Categoria) => {
        const [{ count: ideias }, { count: criativos }] = await Promise.all([
          supabase.from('ideias').select('*', { count: 'exact', head: true }).eq('categoria_id', cat.id),
          supabase.from('criativos').select('*', { count: 'exact', head: true }).eq('categoria_id', cat.id),
        ])
        statsMap[cat.id] = { ideias: ideias ?? 0, criativos: criativos ?? 0 }
      }))
      setStats(statsMap)
    } catch {
      setCategorias([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function getStats(categoriaId: string): CategoriaStats {
    return stats[categoriaId] ?? { ideias: 0, criativos: 0 }
  }

  async function criar(dados: Omit<Categoria, 'id' | 'criado_em'>) {
    const { data, error } = await supabase
      .from('categorias')
      .insert(dados)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setCategorias((prev) => [data, ...prev])
    return data as Categoria
  }

  async function editar(id: string, dados: Partial<Omit<Categoria, 'id' | 'criado_em'>>) {
    const { data, error } = await supabase
      .from('categorias')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setCategorias((prev) => prev.map((c) => (c.id === id ? (data as Categoria) : c)))
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  return { categorias, loading, error, getStats, criar, editar, excluir, recarregar: carregar }
}
