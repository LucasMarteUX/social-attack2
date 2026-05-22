// Edge Function: whatsapp-agent-send
// Envia mensagens do atendente humano via Z-API

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') ?? ''
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN') ?? ''
const ZAPI_SECURITY_TOKEN = Deno.env.get('ZAPI_SECURITY_TOKEN') ?? ''
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  let body: { telefone: string; mensagem: string; delayTyping?: number }
  try {
    body = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const { telefone, mensagem, delayTyping = 1 } = body

  if (!telefone || !mensagem) {
    return new Response(JSON.stringify({ ok: false, error: 'missing fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
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
      return new Response(JSON.stringify({ ok: false, error: errBody }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Erro Z-API:', e)
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
