# Prompt de Construção do Agente

> **Quando usar:** Após o brainstorm da Etapa 1, cole este prompt no Claude  
> junto com todas as respostas e arquivos coletados.  
> O Claude vai gerar todos os arquivos do agente personalizados.

---

---

Com base em tudo que coletamos até agora — respostas, links acessados e arquivos enviados — quero que você construa o agente de atendimento completo.

Gere os seguintes arquivos, todos personalizados para o negócio descrito:

---

## ARQUIVO 1 — Sistema Prompt do Agente

Crie o system prompt completo que será injetado na API de IA (Gemini 2.5 Flash) a cada mensagem recebida.

O system prompt deve conter:

**Identidade**
- Nome do agente
- Nome da empresa/plataforma
- Missão do agente em uma frase

**Tom de voz**
- Como fala (formal, informal, próximo, técnico)
- O que pode e não pode dizer
- Exemplos de respostas corretas e erradas

**Escopo**
- Quais assuntos o agente pode responder
- Quais assuntos deve recusar ou escalar
- O que fazer quando não souber a resposta

**Instruções de formato**
- Tamanho máximo de resposta (máximo 3 linhas para WhatsApp)
- Uso de emojis (sim/não, quantidade)
- Como estruturar listas quando necessário

**Contexto dinâmico**
- Placeholder para a base de conhecimento: `{{BASE_DE_CONHECIMENTO}}`
- Placeholder para histórico da conversa: `{{HISTORICO_CONVERSA}}`

**Regras de escalada**
- Liste as situações exatas em que o agente deve encaminhar para humano
- A mensagem exata que deve enviar ao escalar

**Mensagens padrão**
- Boas-vindas (primeiro contato)
- Fora do escopo
- Escalada para humano
- Rate limiting atingido
- Erro técnico

---

## ARQUIVO 2 — Base de Conhecimento

Estruture toda a informação coletada (respostas, links, arquivos) em uma base de conhecimento organizada por temas.

Para cada tema use o formato:

```
## [Tema]

**Descrição:** o que é, como funciona

**Perguntas frequentes:**
P: [pergunta real ou provável]
R: [resposta correta e completa]

P: [pergunta real ou provável]
R: [resposta correta e completa]

**Palavras-chave:** [lista de termos que identificam este tema]
```

Crie quantas seções forem necessárias baseado no que foi informado. Se alguma informação estiver faltando, liste ao final em "Informações Pendentes" para o responsável preencher depois.

---

## ARQUIVO 3 — Regras de Negócio e Fluxos

Crie um arquivo com:

**Fluxo principal de atendimento**
Diagrama textual de como a conversa deve fluir do início ao fim.

**Palavras-chave por intenção**
Liste as palavras que identificam cada tipo de intenção do usuário:
- Intenção de compra
- Dúvida técnica
- Reclamação
- Cancelamento
- Outras específicas do negócio

**Regras de escalada detalhadas**
Para cada situação de escalada, especifique:
- O que dispara a escalada
- O que o agente faz antes de escalar
- A mensagem exata enviada ao usuário
- O que é registrado no banco de dados

**Limites operacionais**
- Máximo de mensagens por minuto por usuário (recomendado: 5)
- Máximo de mensagens por hora por usuário (recomendado: 20)
- Tamanho máximo de mensagem aceita (recomendado: 1000 chars)
- Horário de atendimento humano disponível

---

## ARQUIVO 4 — Guia Técnico de Implementação

Com base no stack informado, crie um guia passo a passo de implementação contendo:

**Stack de referência**
Este guia usa: React + TypeScript + Supabase (PostgreSQL + Edge Functions) + Z-API + Gemini 2.5 Flash.

**Tabelas do banco de dados**

```sql
-- Configuração do agente (editável pelo admin sem redeploy)
CREATE TABLE whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,  -- 'system_prompt', 'base_conhecimento'
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Uma linha por número de telefone
CREATE TABLE whatsapp_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT UNIQUE NOT NULL,
  nome_contato TEXT,
  status TEXT DEFAULT 'ativo',  -- 'ativo' | 'escalado' | 'encerrado'
  total_mensagens INT DEFAULT 0,
  ultima_mensagem_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Histórico completo de mensagens
CREATE TABLE whatsapp_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' | 'agent'
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Controle de flood por número
CREATE TABLE whatsapp_rate_limit (
  telefone TEXT PRIMARY KEY,
  msgs_ultimo_minuto INT DEFAULT 0,
  msgs_ultima_hora INT DEFAULT 0,
  janela_minuto_at TIMESTAMPTZ DEFAULT now(),
  janela_hora_at TIMESTAMPTZ DEFAULT now()
);

-- Inserts iniciais obrigatórios
INSERT INTO whatsapp_config (chave, valor) VALUES
  ('system_prompt', 'Cole aqui o system prompt gerado no Arquivo 1'),
  ('base_conhecimento', 'Cole aqui a base de conhecimento gerada no Arquivo 2');
```

**Variáveis de ambiente**

No arquivo `.env` do projeto (nunca commitar):
```env
# Z-API — sem prefixo VITE_, apenas server-side
ZAPI_INSTANCE_ID=sua_instancia_id
ZAPI_TOKEN=seu_token_da_instancia
ZAPI_SECURITY_TOKEN=seu_client_token_da_aba_seguranca
```

Nos secrets da Supabase Edge Function (obrigatório — Edge Functions não leem .env):
```
ZAPI_INSTANCE_ID
ZAPI_TOKEN
ZAPI_SECURITY_TOKEN
GEMINI_API_KEY
```

> As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetadas automaticamente pela Supabase.

**Estrutura da Edge Function (Supabase Deno)**

> ⚠️ Edge Functions da Supabase rodam em Deno. Não use `import` de esm.sh nem npm em módulos externos — causam BOOT_ERROR. Use fetch nativo direto na REST API do Supabase.

```typescript
// supabase/functions/whatsapp-webhook/index.ts
// SEM imports externos — apenas fetch nativo

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') ?? ''
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN') ?? ''
const ZAPI_SECURITY_TOKEN = Deno.env.get('ZAPI_SECURITY_TOKEN') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`
// Usar gemini-2.5-flash (ou gemini-2.0-flash-lite) — 1.5-flash está descontinuado
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
const REST = `${SUPABASE_URL}/rest/v1`
const DB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Prefer': 'return=representation',
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  let payload: Record<string, unknown>
  try { payload = await req.json() } catch { return new Response('bad request', { status: 400 }) }

  // ⚠️ Z-API envia o texto em payload.text.message, NÃO em payload.body
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

  // ... processar mensagem, chamar Gemini, salvar no banco, enviar resposta
})

// ⚠️ O Client-Token no header é o ZAPI_SECURITY_TOKEN (aba Segurança), NÃO o ZAPI_TOKEN
async function enviarMensagem(telefone: string, mensagem: string) {
  await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': ZAPI_SECURITY_TOKEN,  // token da aba Segurança, não o instance token
    },
    body: JSON.stringify({ phone: telefone, message: mensagem }),
  })
}
```

**Configuração do webhook Z-API**

1. Painel Z-API → instância → "Webhooks e configurações gerais"
2. Campo "Ao receber" → URL da Edge Function:
   ```
   https://[projeto].supabase.co/functions/v1/whatsapp-webhook
   ```
3. Aba "Segurança" → "Token de Segurança da Conta" → "Configurar Agora" → copiar token → "Ativar Token"
4. Salvar o token gerado no `.env` como `ZAPI_SECURITY_TOKEN` e configurar nos secrets da Supabase

**Prompt exato para o Claude Code**

```
Crie uma Supabase Edge Function em TypeScript/Deno para um agente de atendimento WhatsApp.

Stack: Supabase Edge Functions (Deno), Z-API, Gemini 2.5 Flash

REGRAS OBRIGATÓRIAS:
- Zero imports externos (sem esm.sh, sem npm) — causa BOOT_ERROR no Deno
- Usar fetch nativo na REST API do Supabase (${SUPABASE_URL}/rest/v1/tabela)
- Ler a mensagem de payload.text.message (não payload.body — Z-API usa text.message)
- Incluir Client-Token: ${ZAPI_SECURITY_TOKEN} no header do send-text
- Modelo Gemini: gemini-2.5-flash (não 1.5-flash, está descontinuado)
- Env vars: Deno.env.get('VAR') ?? '' (sem !, sem throw)

FLUXO:
1. Recebe POST da Z-API
2. Extrai telefone e texto de payload.phone e payload.text.message
3. Ignora: fromMe=true, isGroup=true, isNewsletter=true, type≠ReceivedCallback
4. Rate limit: 5 msg/min, 20 msg/hora por telefone (tabela whatsapp_rate_limit)
5. Busca ou cria conversa em whatsapp_conversas
6. Salva mensagem do usuário em whatsapp_mensagens
7. Busca histórico (últimas 20 mensagens) + configs (system_prompt, base_conhecimento)
8. Chama Gemini com system_instruction + histórico + mensagem
9. Detecta keywords de escalação → muda status para 'escalado'
10. Salva resposta em whatsapp_mensagens
11. Envia via Z-API send-text com Client-Token header
12. Retorna 200

TABELAS (já existem no banco):
- whatsapp_config (chave, valor)
- whatsapp_conversas (id, telefone, nome_contato, status, total_mensagens, ultima_mensagem_at)
- whatsapp_mensagens (id, conversa_id, role, conteudo, created_at)
- whatsapp_rate_limit (telefone, msgs_ultimo_minuto, msgs_ultima_hora, janela_minuto_at, janela_hora_at)

Agente: [NOME DO AGENTE] — [DESCRIÇÃO DA EMPRESA]
Keywords de escalação: [lista de palavras que disparam escalação]
```

**Checklist de go-live**

- [ ] Tabelas criadas no Supabase com os inserts iniciais
- [ ] System prompt e base de conhecimento inseridos em `whatsapp_config`
- [ ] Edge Function implantada (status ACTIVE no dashboard)
- [ ] Secrets configurados na Edge Function: ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_SECURITY_TOKEN, GEMINI_API_KEY
- [ ] Client-Token gerado na aba Segurança da Z-API e ativado
- [ ] Webhook "Ao receber" configurado na Z-API com a URL correta
- [ ] Teste de envio: curl send-text com Client-Token retorna messageId
- [ ] Teste de webhook: payload com `text.message` chega no banco e Gemini responde
- [ ] Mensagem real do WhatsApp chega e é respondida
- [ ] Rate limit testado (6ª mensagem recebe aviso)
- [ ] Escalação testada ("quero falar com humano" → status escalado)

---

## ARQUIVO 5 — Plano de Evolução

Crie um roadmap simples com:

**MVP (semana 1-2)**
O mínimo necessário para o agente funcionar.

**Fase 2 (semana 3-4)**
Melhorias imediatas após o MVP validado.

**Fase 3 (mês 2+)**
Evoluções mais avançadas para escalar o atendimento.

**Métricas para monitorar**
Quais números acompanhar para saber se o agente está performando bem.

---

Ao gerar os arquivos, seja específico para o negócio descrito. Não use termos genéricos como "[nome da empresa]" — use o nome real que foi informado. Se alguma informação essencial estiver faltando, faça as perguntas antes de gerar os arquivos.
