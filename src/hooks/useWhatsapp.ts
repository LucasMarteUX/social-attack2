import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface WhatsappConversa {
  id: string
  telefone: string
  nome_contato: string | null
  status: 'ativo' | 'escalado' | 'encerrado'
  label: string | null
  tipo_contato: 'duvida' | 'venda' | null
  etapa_pipeline: 'lead' | 'em_andamento' | 'fechado' | null
  onboarding_completo: boolean
  human_request_count: number
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
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

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

  // Realtime — conversas chegam e atualizam sem refresh
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-conversas-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_conversas' }, (payload) => {
        setConversas((prev) => {
          const nova = payload.new as WhatsappConversa
          if (prev.some((c) => c.id === nova.id)) return prev
          return [nova, ...prev]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversas' }, (payload) => {
        setConversas((prev) =>
          prev
            .map((c) => c.id === payload.new.id ? { ...c, ...(payload.new as WhatsappConversa) } : c)
            .sort((a, b) => {
              const ta = a.ultima_mensagem_at ?? a.created_at
              const tb = b.ultima_mensagem_at ?? b.created_at
              return tb.localeCompare(ta)
            })
        )
      })
      .subscribe()

    realtimeRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function mensagensDeConversa(conversaId: string): Promise<WhatsappMensagem[]> {
    const { data, error } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as WhatsappMensagem[]) ?? []
  }

  function subscribeToMensagens(conversaId: string, onNova: (msg: WhatsappMensagem) => void) {
    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'whatsapp_mensagens',
        filter: `conversa_id=eq.${conversaId}`,
      }, (payload) => onNova(payload.new as WhatsappMensagem))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  async function atualizarConfig(chave: string, valor: string) {
    const { error } = await supabase
      .from('whatsapp_config')
      .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: 'chave' })

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

  async function moverPipeline(conversaId: string, etapa: WhatsappConversa['etapa_pipeline']) {
    const { error } = await supabase
      .from('whatsapp_conversas')
      .update({ etapa_pipeline: etapa })
      .eq('id', conversaId)

    if (error) throw new Error(error.message)
    setConversas((prev) => prev.map((c) => c.id === conversaId ? { ...c, etapa_pipeline: etapa } : c))
  }

  return {
    conversas,
    configs,
    loading,
    error,
    mensagensDeConversa,
    subscribeToMensagens,
    atualizarConfig,
    atualizarStatus,
    moverPipeline,
    recarregar: carregarConversas,
  }
}
