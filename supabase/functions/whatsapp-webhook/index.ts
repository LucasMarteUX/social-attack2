// Edge Function: whatsapp-webhook
// Sem dependências externas — usa fetch direto na REST API do Supabase

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') ?? ''
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN') ?? ''
const ZAPI_SECURITY_TOKEN = Deno.env.get('ZAPI_SECURITY_TOKEN') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
const REST = `${SUPABASE_URL}/rest/v1`
const DB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Prefer': 'return=representation',
}

const ESCALATION_KEYWORDS = ['humano', 'atendente', 'falar com alguém', 'reclamação', 'reembolso', 'cancelar', 'não consigo', 'bug', 'cobrança']

// ---------- helpers REST ----------

async function dbSelect(table: string, params: Record<string, string>) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const res = await fetch(`${REST}/${table}?${qs}`, { headers: DB_HEADERS })
  return res.json()
}

async function dbInsert(table: string, data: Record<string, unknown>) {
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: DB_HEADERS,
    body: JSON.stringify(data),
  })
  return res.json()
}

async function dbUpdate(table: string, filter: Record<string, string>, data: Record<string, unknown>) {
  const qs = Object.entries(filter).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&')
  const res = await fetch(`${REST}/${table}?${qs}`, {
    method: 'PATCH',
    headers: DB_HEADERS,
    body: JSON.stringify(data),
  })
  return res.json()
}

async function dbUpsert(table: string, data: Record<string, unknown>) {
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: { ...DB_HEADERS, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(data),
  })
  return res.json()
}

// ---------- entry point ----------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  // Valida security token (se configurado)
  if (ZAPI_SECURITY_TOKEN) {
    const incoming = req.headers.get('client-token') ?? ''
    if (incoming !== ZAPI_SECURITY_TOKEN) {
      return new Response('unauthorized', { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

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
  const agora = new Date()

  // ---------- Rate limiting ----------
  const rlData: Record<string, unknown>[] = await dbSelect('whatsapp_rate_limit', { 'telefone': `eq.${telefone}` })
  const rl = rlData[0] ?? null

  if (rl) {
    const diffMin = (agora.getTime() - new Date(String(rl.janela_minuto_at)).getTime()) / 1000
    const diffHora = (agora.getTime() - new Date(String(rl.janela_hora_at)).getTime()) / 1000
    const msgsMin = diffMin > 60 ? 1 : Number(rl.msgs_ultimo_minuto) + 1
    const msgsHora = diffHora > 3600 ? 1 : Number(rl.msgs_ultima_hora) + 1

    await dbUpsert('whatsapp_rate_limit', {
      telefone,
      msgs_ultimo_minuto: msgsMin,
      msgs_ultima_hora: msgsHora,
      janela_minuto_at: diffMin > 60 ? agora.toISOString() : rl.janela_minuto_at,
      janela_hora_at: diffHora > 3600 ? agora.toISOString() : rl.janela_hora_at,
    })

    if (Number(rl.msgs_ultimo_minuto) >= 5 && diffMin <= 60) {
      await enviarMensagem(telefone, 'Calma aí! Muitas mensagens de uma vez. Tenta de novo em 1 minuto.')
      return new Response('rate limited', { status: 200 })
    }
    if (Number(rl.msgs_ultima_hora) >= 20 && diffHora <= 3600) {
      await enviarMensagem(telefone, 'Você atingiu o limite de mensagens por hora. Tenta mais tarde ou fale com o suporte.')
      return new Response('rate limited', { status: 200 })
    }
  } else {
    await dbInsert('whatsapp_rate_limit', {
      telefone,
      msgs_ultimo_minuto: 1,
      msgs_ultima_hora: 1,
      janela_minuto_at: agora.toISOString(),
      janela_hora_at: agora.toISOString(),
    })
  }

  // ---------- Conversa ----------
  const conversasData: Record<string, unknown>[] = await dbSelect('whatsapp_conversas', {
    'telefone': `eq.${telefone}`,
    'select': 'id,status,total_mensagens',
  })
  const conversaExistente = conversasData[0] ?? null
  const primeiroContato = !conversaExistente
  let conversa: { id: string; status: string; total_mensagens: number }

  if (conversaExistente) {
    conversa = conversaExistente as { id: string; status: string; total_mensagens: number }
  } else {
    const nova = await dbInsert('whatsapp_conversas', {
      telefone,
      nome_contato: nomeContato,
      status: 'ativo',
      total_mensagens: 0,
    })
    if (!nova || nova.length === 0) {
      console.error('Erro ao criar conversa')
      return new Response('error', { status: 500 })
    }
    conversa = nova[0]
  }

  if (conversa.status === 'escalado') {
    await enviarMensagem(telefone, 'Sua conversa já está com a equipe de suporte. Em breve alguém vai te responder. ⚡')
    return new Response('escalated', { status: 200 })
  }

  // Salva mensagem do usuário
  await dbInsert('whatsapp_mensagens', { conversa_id: conversa.id, role: 'user', conteudo: texto })

  // ---------- Histórico ----------
  const historico: Record<string, unknown>[] = await dbSelect('whatsapp_mensagens', {
    'conversa_id': `eq.${conversa.id}`,
    'select': 'role,conteudo',
    'order': 'created_at.desc',
    'limit': '20',
  })
  const historicoTexto = historico
    .reverse()
    .map((m) => `${m.role === 'user' ? 'Usuário' : 'Attack'}: ${m.conteudo}`)
    .join('\n')

  // ---------- Config ----------
  const configsData: Record<string, unknown>[] = await dbSelect('whatsapp_config', {
    'chave': 'in.(system_prompt,base_conhecimento)',
    'select': 'chave,valor',
  })
  const configMap: Record<string, string> = {}
  for (const c of configsData) configMap[String(c.chave)] = String(c.valor)

  const systemPrompt = (configMap['system_prompt'] ?? 'Você é o Attack, assistente do Social Attack. Responda de forma direta, jovem e informal.')
    .replace('{{BASE_DE_CONHECIMENTO}}', configMap['base_conhecimento'] ?? '')
    .replace('{{HISTORICO_CONVERSA}}', historicoTexto)

  // ---------- Gemini ----------
  let respostaAgente = 'Algo deu errado por aqui. Tenta de novo em alguns segundos.'

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
    if (candidato) respostaAgente = String(candidato).trim()
  } catch (e) {
    console.error('Gemini error:', e)
  }

  // ---------- Escalação ----------
  const textoEscalacao = (texto + ' ' + respostaAgente).toLowerCase()
  const deveEscalar = ESCALATION_KEYWORDS.some((kw) => textoEscalacao.includes(kw))

  if (deveEscalar) {
    await dbUpdate('whatsapp_conversas', { id: conversa.id }, { status: 'escalado', ultima_mensagem_at: agora.toISOString() })
    respostaAgente = 'Entendi. Vou chamar alguém da equipe pra te ajudar. Seg–Sex das 9h às 18h, respondemos em até 2h ⚡'
  } else {
    await dbUpdate('whatsapp_conversas', { id: conversa.id }, {
      ultima_mensagem_at: agora.toISOString(),
      total_mensagens: conversa.total_mensagens + 2,
      ...(nomeContato && !conversaExistente ? { nome_contato: nomeContato } : {}),
    })
  }

  await dbInsert('whatsapp_mensagens', { conversa_id: conversa.id, role: 'agent', conteudo: respostaAgente })

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
    console.error('Erro Z-API:', e)
  }
}
