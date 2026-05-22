// Edge Function: whatsapp-agent-send
// Envia mensagens do atendente humano via Z-API
// Todas as respostas devem incluir CORS — chamadas vêm do browser (Vite/hosting).

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') ?? ''
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN') ?? ''
const ZAPI_SECURITY_TOKEN = Deno.env.get('ZAPI_SECURITY_TOKEN') ?? ''
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function text(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') return text('method not allowed', 405)

  let body: { telefone: string; mensagem: string; delayTyping?: number }
  try {
    body = await req.json()
  } catch {
    return text('bad request', 400)
  }

  const { telefone, mensagem, delayTyping = 1 } = body

  if (!telefone || !mensagem) {
    return json({ ok: false, error: 'missing fields' }, 400)
  }

  try {
    const res = await fetch(`${ZAPI_BASE}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_SECURITY_TOKEN,
      },
      body: JSON.stringify({ phone: telefone, message: mensagem, delayTyping }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Z-API send-text erro:', res.status, errBody)
      return json({ ok: false, error: errBody }, 502)
    }

    return json({ ok: true })
  } catch (e) {
    console.error('Erro Z-API:', e)
    return json({ ok: false, error: String(e) }, 500)
  }
})
