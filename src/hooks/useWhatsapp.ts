import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface WhatsappConversa {
  id: string
  telefone: string
  nome_contato: string | null
  status: 'ativo' | 'escalado' | 'encerrado' | 'manual'
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
  role: 'user' | 'agent' | 'humano' | 'divider'
  conteudo: string
  created_at: string
}

export interface WhatsappConfig {
  chave: string
  valor: string
  updated_at: string
}

/** Z-API e webhook armazenam com DDI Brasil (55…) — normaliza apenas dígitos. */
export function telefoneSomenteDigitosParaZApi(raw: string): string {
  const head = (raw.split('@')[0] ?? raw).trim()
  const d = head.replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  if (!d.startsWith('55') && d.length >= 10 && d.length <= 11) return `55${d}`
  return d
}

async function dispararPainelParaWhatsApp(telefoneArmazenado: string, mensagem: string, delayTyping = 1) {
  const telefone = telefoneSomenteDigitosParaZApi(telefoneArmazenado)
  if (!telefone) throw new Error('Telefone da conversa inválido.')

  const { data, error } = await supabase.functions.invoke('whatsapp-agent-send', {
    body: { telefone, mensagem, delayTyping },
  })

  const msgFallback = error?.message?.trim()
  if (msgFallback === 'Failed to send a request to the Edge Function' || msgFallback === 'FunctionsFetchError') {
    throw new Error(
      'Não foi possível contactar a função whatsapp-agent-send (rede ou CORS). Atualize a página e verifique no Supabase Dashboard se ela existe e está publicada.',
    )
  }
  if (error) throw new Error(error.message ?? 'Erro ao chamar whatsapp-agent-send.')

  type Resp = { ok?: boolean; error?: string }
  const payload = data as Resp | null
  if (payload && typeof payload === 'object' && payload.ok === false) {
    const det = typeof payload.error === 'string' ? payload.error : 'Resposta da Z-API inválida'
    throw new Error(det)
  }
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

  const mensagensDeConversa = useCallback(async (conversaId: string): Promise<WhatsappMensagem[]> => {
    const { data, error } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as WhatsappMensagem[]) ?? []
  }, [])

  const subscribeToMensagens = useCallback((conversaId: string, onNova: (msg: WhatsappMensagem) => void) => {
    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_mensagens', filter: `conversa_id=eq.${conversaId}` },
        (payload) => onNova(payload.new as WhatsappMensagem),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

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

  async function assumirAtendimento(conversaId: string, telefone: string, atendenteNome: string) {
    const { data: row, error: eRow } = await supabase.from('whatsapp_conversas').select('status').eq('id', conversaId).single()
    if (eRow || !row) throw new Error(eRow?.message ?? 'Conversa não encontrada.')

    const prevStatus = row.status as WhatsappConversa['status']

    const { error } = await supabase.from('whatsapp_conversas').update({ status: 'manual' }).eq('id', conversaId)
    if (error) throw new Error(error.message)

    const { data: divRow, error: eDiv } = await supabase
      .from('whatsapp_mensagens')
      .insert({ conversa_id: conversaId, role: 'divider', conteudo: atendenteNome })
      .select('id')
      .single()
    if (eDiv || !divRow?.id) {
      await supabase.from('whatsapp_conversas').update({ status: prevStatus }).eq('id', conversaId)
      throw new Error(eDiv?.message ?? 'Não foi possível registar o divisor na conversa.')
    }

    const msgBemVindo = `Olá! A partir de agora você está falando com *${atendenteNome}*, da equipe Social Attack. Como posso te ajudar? 👋`

    try {
      await dispararPainelParaWhatsApp(telefone, msgBemVindo, 2)
    } catch (e) {
      await supabase.from('whatsapp_mensagens').delete().eq('id', divRow.id)
      await supabase.from('whatsapp_conversas').update({ status: prevStatus }).eq('id', conversaId)
      throw e
    }

    const agora = new Date().toISOString()
    await supabase.from('whatsapp_mensagens').insert({ conversa_id: conversaId, role: 'humano', conteudo: msgBemVindo })
    await supabase.from('whatsapp_conversas').update({ ultima_mensagem_at: agora }).eq('id', conversaId)

    setConversas((prev) => prev.map((c) => c.id === conversaId ? { ...c, status: 'manual' } : c))
  }

  async function enviarMensagemHumana(conversaId: string, telefone: string, mensagem: string) {
    const { data: inserida, error: eIns } = await supabase
      .from('whatsapp_mensagens')
      .insert({ conversa_id: conversaId, role: 'humano', conteudo: mensagem })
      .select('id')
      .single()
    if (eIns || !inserida?.id) throw new Error(eIns?.message ?? 'Falha ao gravar mensagem.')

    try {
      await dispararPainelParaWhatsApp(telefone, mensagem, 1)
    } catch (e) {
      await supabase.from('whatsapp_mensagens').delete().eq('id', inserida.id)
      throw e
    }

    await supabase.from('whatsapp_conversas').update({ ultima_mensagem_at: new Date().toISOString() }).eq('id', conversaId)
  }

  async function voltarParaAutomatico(conversaId: string, telefone: string) {
    const msg = 'O assistente virtual *Spark* volta a te atender por aqui. Pode perguntar o que precisar! 👋'
    await dispararPainelParaWhatsApp(telefone, msg, 1)
    await supabase.from('whatsapp_mensagens').insert({ conversa_id: conversaId, role: 'agent', conteudo: msg })
    const { error } = await supabase.from('whatsapp_conversas').update({
      status: 'ativo',
      ultima_mensagem_at: new Date().toISOString(),
    }).eq('id', conversaId)
    if (error) throw new Error(error.message)
    setConversas((prev) => prev.map((c) => c.id === conversaId ? { ...c, status: 'ativo' } : c))
  }

  async function encerrarConversaManual(conversaId: string, telefone: string) {
    const msgEncerramento =
      'Atendimento encerrado por aqui. Quando precisar de novo, é só nos mandar *uma nova mensagem* por este WhatsApp — o Spark (IA) volta a te atender do início. Até mais! 😊'
    await dispararPainelParaWhatsApp(telefone, msgEncerramento, 1)

    await supabase.from('whatsapp_mensagens').insert({ conversa_id: conversaId, role: 'humano', conteudo: msgEncerramento })
    await supabase.from('whatsapp_conversas').update({ status: 'encerrado', ultima_mensagem_at: new Date().toISOString() }).eq('id', conversaId)
    setConversas((prev) => prev.map((c) => c.id === conversaId ? { ...c, status: 'encerrado' } : c))
  }

  async function moverPipeline(conversaId: string, etapa: WhatsappConversa['etapa_pipeline']) {
    const { error } = await supabase
      .from('whatsapp_conversas')
      .update({ etapa_pipeline: etapa })
      .eq('id', conversaId)

    if (error) throw new Error(error.message)
    setConversas((prev) => prev.map((c) => c.id === conversaId ? { ...c, etapa_pipeline: etapa } : c))
  }

  async function classificarLead(conversaId: string, etapa: WhatsappConversa['etapa_pipeline']) {
    const tipo_contato: WhatsappConversa['tipo_contato'] = etapa === null ? null : 'venda'
    const { error } = await supabase
      .from('whatsapp_conversas')
      .update({ tipo_contato, etapa_pipeline: etapa })
      .eq('id', conversaId)
    if (error) throw new Error(error.message)
    setConversas((prev) => prev.map((c) =>
      c.id === conversaId ? { ...c, tipo_contato, etapa_pipeline: etapa } : c
    ))
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
    classificarLead,
    assumirAtendimento,
    enviarMensagemHumana,
    voltarParaAutomatico,
    encerrarConversaManual,
    recarregar: carregarConversas,
  }
}
