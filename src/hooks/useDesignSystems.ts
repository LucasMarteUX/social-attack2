import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DesignSystem } from '../data/mock'

export function useDesignSystems() {
  const [designSystems, setDesignSystems] = useState<DesignSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('design_systems')
        .select('id, name, markdown, is_active, reference_image_urls, created_at, updated_at')
        .order('created_at', { ascending: false })
      if (error) {
        setDesignSystems([])
        setError(null)
      } else {
        setDesignSystems(
          (data ?? []).map((row) => ({
            ...(row as DesignSystem),
            reference_image_urls: Array.isArray((row as DesignSystem).reference_image_urls)
              ? (row as DesignSystem).reference_image_urls
              : [],
          }))
        )
      }
    } catch {
      setDesignSystems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados: Omit<DesignSystem, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('design_systems')
      .insert(dados)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setDesignSystems((prev) => [data as DesignSystem, ...prev])
    return data as DesignSystem
  }

  async function editar(id: string, dados: Partial<Omit<DesignSystem, 'id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('design_systems')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setDesignSystems((prev) => prev.map((ds) => (ds.id === id ? (data as DesignSystem) : ds)))
    return data as DesignSystem
  }

  async function duplicar(id: string) {
    const original = designSystems.find((ds) => ds.id === id)
    if (!original) throw new Error('Design system não encontrado')
    const { id: _, created_at: __, updated_at: ___, ...campos } = original
    return criar({ ...campos, name: `${campos.name} (cópia)` })
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('design_systems').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setDesignSystems((prev) => prev.filter((ds) => ds.id !== id))
  }

  function getById(id: string) {
    return designSystems.find((ds) => ds.id === id)
  }

  return { designSystems, loading, error, criar, editar, duplicar, excluir, getById, recarregar: carregar }
}
