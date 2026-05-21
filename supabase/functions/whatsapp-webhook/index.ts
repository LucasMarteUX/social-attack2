import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID')!
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const ESCALATION_KEYWORDS = ['humano', 'atendente', 'falar com alguém', 'reclamação', 'reembolso', 'cancelar', 'não consigo', 'bug', 'cobrança']

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  // Ignora mensagens enviadas pelo próprio número, grupos e não-texto
  if (
    payload.fromMe === true ||
    payload.isGroup === true ||
    payload.type !== 'ReceivedCallback' ||
    typeof payload.body !== 'string' ||
    !payload.phone
  ) {
    return new Response('ignored', { status: 200 })
  }

  const telefone = String(payload.phone)
  const texto = String(payload.body).trim().slice(0, 1000)
  const nomeContato = typeof payload.senderName === 'string' ? payload.senderName : null

  // ---------- Rate limiting ----------
  const { data: rl } = await db
    .from('whatsapp_rate_limit')
    .select('*')
    .eq('telefone', telefone)
    .maybeSingle()

  const agora = new Date()

  if (rl) {
    const janelaMin = new Date(rl.janela_minuto_at)
    const janelaHora = new Date(rl.janela_hora_at)
    const diffMin = (agora.getTime() - janelaMin.getTime()) / 1000
    const diffHora = (agora.getTime() - janelaHora.getTime()) / 1000

    const msgsMin = diffMin > 60 ? 1 : rl.msgs_ultimo_minuto + 1
    const msgsHora = diffHora > 3600 ? 1 : rl.msgs_ultima_hora + 1

    await db.from('whatsapp_rate_limit').upsert({
      telefone,
      msgs_ultimo_minuto: msgsMin,
      msgs_ultima_hora: msgsHora,
      janela_minuto_at: diffMin > 60 ? agora.toISOString() : rl.janela_minuto_at,
      janela_hora_at: diffHora > 3600 ? agora.toISOString() : rl.janela_hora_at,
    })

    if (rl.msgs_ultimo_minuto >= 5 && diffMin <= 60) {
      await enviarMensagem(telefone, 'Calma aí! Muitas mensagens de uma vez. Tenta de novo em 1 minuto.')
      return new Response('rate limited', { status: 200 })
    }
    if (rl.msgs_ultima_hora >= 20 && diffHora <= 3600) {
      await enviarMensagem(telefone, 'Você atingiu o limite de mensagens por hora. Tenta mais tarde ou fale com o suporte.')
      return new Response('rate limited', { status: 200 })
    }
  } else {
    await db.from('whatsapp_rate_limit').insert({
      telefone,
      msgs_ultimo_minuto: 1,
      msgs_ultima_hora: 1,
      janela_minuto_at: agora.toISOString(),
      janela_hora_at: agora.toISOString(),
    })
  }

  // ---------- Conversa ----------
  let conversa: { id: string; status: string; total_mensagens: number }

  const { data: conversaExistente } = await db
    .from('whatsapp_conversas')
    .select('id, status, total_mensagens')
    .eq('telefone', telefone)
    .maybeSingle()

  const primeiroContato = !conversaExistente

  if (conversaExistente) {
    conversa = conversaExistente
  } else {
    const { data: nova, error } = await db
      .from('whatsapp_conversas')
      .insert({ telefone, nome_contato: nomeContato, status: 'ativo', total_mensagens: 0 })
      .select('id, status, total_mensagens')
      .single()
    if (error || !nova) {
      console.error('Erro ao criar conversa:', error)
      return new Response('error', { status: 500 })
    }
    conversa = nova
  }

  // Conversa já escalada → avisa e ignora
  if (conversa.status === 'escalado') {
    await enviarMensagem(telefone, 'Sua conversa já está com a equipe de suporte. Em breve alguém vai te responder. ⚡')
    return new Response('escalated', { status: 200 })
  }

  // Salva mensagem do usuário
  await db.from('whatsapp_mensagens').insert({
    conversa_id: conversa.id,
    role: 'user',
    conteudo: texto,
  })

  // ---------- Histórico (últimas 10 trocas) ----------
  const { data: historico } = await db
    .from('whatsapp_mensagens')
    .select('role, conteudo, created_at')
    .eq('conversa_id', conversa.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const historicoTexto = (historico ?? [])
    .reverse()
    .map((m: { role: string; conteudo: string }) => `${m.role === 'user' ? 'Usuário' : 'Attack'}: ${m.conteudo}`)
    .join('\n')

  // ---------- Config do agente ----------
  const { data: configs } = await db
    .from('whatsapp_config')
    .select('chave, valor')
    .in('chave', ['system_prompt', 'base_conhecimento'])

  const configMap: Record<string, string> = {}
  for (const c of configs ?? []) configMap[c.chave] = c.valor

  const systemPrompt = (configMap['system_prompt'] ?? '')
    .replace('{{BASE_DE_CONHECIMENTO}}', configMap['base_conhecimento'] ?? '')
    .replace('{{HISTORICO_CONVERSA}}', historicoTexto)

  // ---------- Gemini ----------
  let respostaAgente = 'Algo deu errado aqui. Tenta mandar a mensagem de novo em alguns segundos.'

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: texto }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    })

    const geminiData = await geminiRes.json()
    const candidato = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (candidato) respostaAgente = candidato.trim()
  } catch (e) {
    console.error('Gemini error:', e)
  }

  // ---------- Escalação ----------
  const textoEscalacao = (texto + ' ' + respostaAgente).toLowerCase()
  const deveEscalar = ESCALATION_KEYWORDS.some((kw) => textoEscalacao.includes(kw))

  if (deveEscalar) {
    await db.from('whatsapp_conversas').update({ status: 'escalado', ultima_mensagem_at: agora.toISOString() }).eq('id', conversa.id)
    respostaAgente = 'Entendi. Vou chamar alguém da equipe pra te ajudar. Seg–Sex das 9h às 18h, respondemos em até 2h ⚡'
  } else {
    await db.from('whatsapp_conversas').update({
      ultima_mensagem_at: agora.toISOString(),
      total_mensagens: conversa.total_mensagens + 2,
      ...(nomeContato && !conversaExistente ? { nome_contato: nomeContato } : {}),
    }).eq('id', conversa.id)
  }

  // Salva resposta
  await db.from('whatsapp_mensagens').insert({
    conversa_id: conversa.id,
    role: 'agent',
    conteudo: respostaAgente,
  })

  // Envia boas-vindas no primeiro contato
  if (primeiroContato) {
    await enviarMensagem(telefone, 'Oi! 👋 Sou o Attack, assistente do Social Attack. Como posso te ajudar?')
  }

  await enviarMensagem(telefone, respostaAgente)

  return new Response('ok', { status: 200 })
})

async function enviarMensagem(telefone: string, mensagem: string) {
  try {
    await fetch(`${ZAPI_BASE}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
    })
  } catch (e) {
    console.error('Erro ao enviar mensagem Z-API:', e)
  }
}
