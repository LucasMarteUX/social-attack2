import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface WhatsappConversa {
  id: string
  telefone: string
  nome_contato: string | null
  status: 'ativo' | 'escalado' | 'encerrado'
  total_mensagens: number
  ultima_mensagem_at: string | null
  created_at: string
}

export interface WhatsappMensagem {
  id: string
  conversa_id: string
  role: 'user' | 'agent'
  conteudo: string
  created_at: string
}

export interface WhatsappConfig {
  chave: string
  valor: string
  updated_at: string
}

export function useWhatsapp() {
  const [conversas, setConversas] = useState<WhatsappConversa[]>([])
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarConversas = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_conversas')
      .select('*')
      .order('ultima_mensagem_at', { ascending: false, nullsFirst: false })

    if (error) { setError(error.message); return }
    setConversas((data as WhatsappConversa[]) ?? [])
  }, [])

  const carregarConfigs = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('chave, valor, updated_at')

    if (error) { setError(error.message); return }
    const map: Record<string, string> = {}
    for (const c of (data as WhatsappConfig[]) ?? []) map[c.chave] = c.valor
    setConfigs(map)
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([carregarConversas(), carregarConfigs()])
      setLoading(false)
    }
    init()
  }, [carregarConversas, carregarConfigs])

  async function mensagensDeConversa(conversaId: string): Promise<WhatsappMensagem[]> {
    const { data, error } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as WhatsappMensagem[]) ?? []
  }

  async function atualizarConfig(chave: string, valor: string) {
    const { error } = await supabase
      .from('whatsapp_config')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave)

    if (error) throw new Error(error.message)
    setConfigs((prev) => ({ ...prev, [chave]: valor }))
  }

  async function atualizarStatus(conversaId: string, status: WhatsappConversa['status']) {
    const { error } = await supabase
      .from('whatsapp_conversas')
      .update({ status })
      .eq('id', conversaId)

    if (error) throw new Error(error.message)
    setConversas((prev) => prev.map((c) => c.id === conversaId ? { ...c, status } : c))
  }

  return {
    conversas,
    configs,
    loading,
    error,
    mensagensDeConversa,
    atualizarConfig,
    atualizarStatus,
    recarregar: carregarConversas,
  }
}
