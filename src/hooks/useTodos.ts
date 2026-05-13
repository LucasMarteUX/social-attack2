import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Todo } from '../data/mock'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) setError(error.message)
    else setTodos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criar(dados: Omit<Todo, 'id' | 'criado_em' | 'concluida'>) {
    const { data, error } = await supabase
      .from('todos')
      .insert({ ...dados, concluida: false })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTodos((prev) => [data as Todo, ...prev])
    return data as Todo
  }

  async function toggleConcluida(id: string) {
    const todo = todos.find((t) => t.id === id)
    if (!todo) return
    const novoValor = !todo.concluida
    const { error } = await supabase.from('todos').update({ concluida: novoValor }).eq('id', id)
    if (error) throw new Error(error.message)
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: novoValor } : t)))
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  return { todos, loading, error, criar, toggleConcluida, excluir }
}
