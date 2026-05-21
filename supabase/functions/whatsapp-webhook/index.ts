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
const SALE_CONFIRMED_KEYWORDS = ['quero contratar', 'vou assinar', 'pode me mandar o link', 'como faço pra assinar', 'quero me cadastrar', 'fechar o plano', 'quero o pro', 'quero o plano', 'vou pagar', 'manda o pix', 'manda o link', 'como eu pago']

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

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  // Ignora: enviado por mim, grupos, não-texto, sem telefone
  const textObj = payload.text as Record<string, unknown> | undefined
  const textoRaw = typeof textObj?.message === 'string' ? textObj.message : null

  if (
    payload.fromMe === true ||
    payload.isGroup === true ||
    payload.isNewsletter === true ||
    payload.type !== 'ReceivedCallback' ||
    !textoRaw ||
    !payload.phone
  ) {
    return new Response('ignored', { status: 200 })
  }

  const telefone = String(payload.phone)
  const texto = textoRaw.trim().slice(0, 1000)
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
    'select': 'id,status,total_mensagens,onboarding_completo,tipo_contato,etapa_pipeline,human_request_count,label',
  })
  const conversaExistente = conversasData[0] ?? null
  let conversa: {
    id: string
    status: string
    total_mensagens: number
    onboarding_completo: boolean
    tipo_contato: string | null
    etapa_pipeline: string | null
    human_request_count: number
    label: string | null
  }

  if (conversaExistente) {
    conversa = conversaExistente as typeof conversa
  } else {
    const nova = await dbInsert('whatsapp_conversas', {
      telefone,
      nome_contato: nomeContato,
      status: 'ativo',
      total_mensagens: 0,
      onboarding_completo: false,
      human_request_count: 0,
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

  // ---------- Onboarding ----------
  // Se o onboarding ainda não foi concluído, enviar menu de opções
  if (!conversa.onboarding_completo) {
    const textoNorm = texto.trim()

    // Usuário respondeu ao menu (1, 2 ou 3)
    if (['1', '2', '3'].includes(textoNorm)) {
      let tipoContato: string
      let etapaPipeline: string | null = null
      let respostaOnboarding: string

      if (textoNorm === '1') {
        tipoContato = 'duvida'
        respostaOnboarding = 'Ótimo! Me conta qual é a sua dúvida sobre o Social Attack 😊'
      } else if (textoNorm === '2') {
        tipoContato = 'venda'
        etapaPipeline = 'lead'
        respostaOnboarding = 'Que ótimo! Vou te apresentar os nossos planos.\n\nTemos três opções:\n\n🆓 *Gratuito* — 5 criativos/mês, sem geração de imagens\n⚡ *Pro* — R$ 79/mês — criativos ilimitados + geração de imagens (14 dias grátis!)\n🏢 *Agência* — R$ 199/mês — múltiplos clientes + suporte dedicado\n\nQual opção te interessou mais?'
      } else {
        tipoContato = 'duvida'
        respostaOnboarding = 'Perfeito! Pode me contar o que está acontecendo que eu te ajudo 🙌'
      }

      await dbUpdate('whatsapp_conversas', { id: conversa.id }, {
        onboarding_completo: true,
        tipo_contato: tipoContato,
        etapa_pipeline: etapaPipeline,
        ultima_mensagem_at: agora.toISOString(),
        total_mensagens: conversa.total_mensagens + 2,
        ...(nomeContato && !conversaExistente ? { nome_contato: nomeContato } : {}),
      })

      await dbInsert('whatsapp_mensagens', { conversa_id: conversa.id, role: 'agent', conteudo: respostaOnboarding })
      await enviarMensagem(telefone, respostaOnboarding)
      return new Response('ok', { status: 200 })
    }

    // Primeira mensagem ou resposta inválida ao menu — enviar/reenviar menu
    const configsMenu: Record<string, unknown>[] = await dbSelect('whatsapp_config', {
      'chave': 'eq.onboarding_menu',
      'select': 'valor',
    })
    const menuTexto = configsMenu[0]
      ? String(configsMenu[0].valor)
      : 'Oi! Sou o Spark, assistente do Social Attack 👋\n\nComo posso te ajudar?\n\n1️⃣ Tenho uma dúvida sobre a plataforma\n2️⃣ Quero conhecer os planos e contratar\n3️⃣ Já sou cliente e preciso de suporte\n\nResponde com 1, 2 ou 3!'

    await dbUpdate('whatsapp_conversas', { id: conversa.id }, {
      ultima_mensagem_at: agora.toISOString(),
      total_mensagens: conversa.total_mensagens + 2,
      ...(nomeContato && !conversaExistente ? { nome_contato: nomeContato } : {}),
    })

    await dbInsert('whatsapp_mensagens', { conversa_id: conversa.id, role: 'agent', conteudo: menuTexto })
    await enviarMensagem(telefone, menuTexto)
    return new Response('ok', { status: 200 })
  }

  // ---------- Detecção de pedido de humano ----------
  const textoLower = texto.toLowerCase()
  const pedindoHumano = ESCALATION_KEYWORDS.some((kw) => textoLower.includes(kw))
  let humanRequestCount = conversa.human_request_count

  if (pedindoHumano) {
    humanRequestCount += 1

    if (humanRequestCount >= 2) {
      // Segunda solicitação → escala imediata + label
      await dbUpdate('whatsapp_conversas', { id: conversa.id }, {
        status: 'escalado',
        label: 'PRECISA_ATENDIMENTO_HUMANO',
        human_request_count: humanRequestCount,
        ultima_mensagem_at: agora.toISOString(),
      })
      const msgEscalada = 'Entendido! Vou acionar nosso time de atendimento agora. Um humano entrará em contato assim que possível (Seg–Sex 9h–18h | Sáb 9h–13h). Obrigado pela paciência! 🙏'
      await dbInsert('whatsapp_mensagens', { conversa_id: conversa.id, role: 'agent', conteudo: msgEscalada })
      await enviarMensagem(telefone, msgEscalada)
      return new Response('escalated', { status: 200 })
    }

    // Primeira solicitação → informa horário mas continua tentando
    await dbUpdate('whatsapp_conversas', { id: conversa.id }, { human_request_count: humanRequestCount })
  }

  // ---------- Histórico ----------
  const historico: Record<string, unknown>[] = await dbSelect('whatsapp_mensagens', {
    'conversa_id': `eq.${conversa.id}`,
    'select': 'role,conteudo',
    'order': 'created_at.desc',
    'limit': '20',
  })
  const historicoTexto = historico
    .reverse()
    .map((m) => `${m.role === 'user' ? 'Usuário' : 'Spark'}: ${m.conteudo}`)
    .join('\n')

  // ---------- Config ----------
  const configsData: Record<string, unknown>[] = await dbSelect('whatsapp_config', {
    'chave': 'in.(system_prompt,base_conhecimento)',
    'select': 'chave,valor',
  })
  const configMap: Record<string, string> = {}
  for (const c of configsData) configMap[String(c.chave)] = String(c.valor)

  const systemPrompt = (configMap['system_prompt'] ?? 'Você é Spark, assistente do Social Attack. Responda de forma direta, jovem e informal.')
    .replace('{{BASE_DE_CONHECIMENTO}}', configMap['base_conhecimento'] ?? '')
    .replace('{{HISTORICO_CONVERSA}}', historicoTexto)

  // Contexto extra para leads em processo de venda
  const contextoVenda = conversa.tipo_contato === 'venda'
    ? '\n\nCONTEXTO: Este usuário está interessado em contratar o Social Attack. Foque em apresentar os benefícios dos planos Pro e Agência, tire dúvidas sobre preços e incentive o próximo passo (cadastro para teste grátis de 14 dias).'
    : ''

  // ---------- Gemini ----------
  let respostaAgente = 'Algo deu errado por aqui. Tenta de novo em alguns segundos.'

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt + contextoVenda }] },
        contents: [{ role: 'user', parts: [{ text: texto }] }],
        generationConfig: { maxOutputTokens: 350, temperature: 0.7 },
      }),
    })
    const geminiData = await geminiRes.json()
    const candidato = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (candidato) respostaAgente = String(candidato).trim()
  } catch (e) {
    console.error('Gemini error:', e)
  }

  // ---------- Pipeline — detecção automática de venda fechada ----------
  if (conversa.tipo_contato === 'venda' && conversa.etapa_pipeline !== 'fechado') {
    const textoVenda = textoLower
    const vendaConfirmada = SALE_CONFIRMED_KEYWORDS.some((kw) => textoVenda.includes(kw))

    if (vendaConfirmada) {
      await dbUpdate('whatsapp_conversas', { id: conversa.id }, { etapa_pipeline: 'fechado' })
    } else if (conversa.etapa_pipeline === 'lead') {
      // Se já houve mais de 3 trocas de mensagens no fluxo de venda, avança para em_andamento
      if (conversa.total_mensagens >= 6) {
        await dbUpdate('whatsapp_conversas', { id: conversa.id }, { etapa_pipeline: 'em_andamento' })
      }
    }
  }

  // ---------- Atualiza conversa ----------
  await dbUpdate('whatsapp_conversas', { id: conversa.id }, {
    ultima_mensagem_at: agora.toISOString(),
    total_mensagens: conversa.total_mensagens + 2,
    ...(nomeContato && !conversaExistente ? { nome_contato: nomeContato } : {}),
  })

  await dbInsert('whatsapp_mensagens', { conversa_id: conversa.id, role: 'agent', conteudo: respostaAgente })
  await enviarMensagem(telefone, respostaAgente)

  return new Response('ok', { status: 200 })
})

async function enviarMensagem(telefone: string, mensagem: string) {
  try {
    const res = await fetch(`${ZAPI_BASE}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_SECURITY_TOKEN,
      },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      console.error('Z-API send-text erro:', res.status, errBody)
    }
  } catch (e) {
    console.error('Erro Z-API:', e)
  }
}
