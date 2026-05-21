# Framework de Agente de Atendimento WhatsApp com IA

**Por:** Lucas  
**Versão:** 2.0 — Maio 2026

---

## O que é este framework

Um conjunto de prompts reutilizáveis que permite criar um agente de atendimento WhatsApp com IA personalizado para qualquer negócio.

Funciona para qualquer tipo de empresa: SaaS, e-commerce, clínica, escola, agência, consultoria. Cada agente criado com este framework terá sua própria identidade, regras e base de conhecimento.

---

## Como funciona

O processo tem três momentos:

```
1. CRIAR
   Usar o prompt de onboarding para coletar informações do negócio
   Claude faz um brainstorm, acessa links, lê arquivos
   Claude gera todos os arquivos do agente personalizados
          ↓

2. IMPLEMENTAR
   Pegar os arquivos gerados e passar pro Claude Code
   Claude Code cria a Edge Function, as tabelas, o componente React
   Configurar Z-API, variáveis de ambiente, fazer go-live
          ↓

3. EVOLUIR
   Usar o prompt de atualização sempre que quiser melhorar
   Corrigir erros, adicionar conhecimento, ajustar tom de voz
   O agente fica melhor com o tempo sem precisar de redeploy
```

---

## Os Arquivos

| Arquivo | Para que serve | Quando usar |
|---------|---------------|-------------|
| `01_prompt_onboarding.md` | Inicia o brainstorm com o Claude | Primeira vez, para um negócio novo |
| `02_prompt_construcao.md` | Gera todos os arquivos do agente | Após o brainstorm estar completo |
| `03_prompt_atualizacao.md` | Evolui o agente após o go-live | Sempre que quiser melhorar |

---

## Passo a Passo Completo

### Passo 1 — Abrir uma conversa nova no Claude

Importante: sempre abra uma conversa nova para cada negócio. Não misture projetos na mesma conversa.

### Passo 2 — Colar o Prompt de Onboarding

Copie o conteúdo de `01_prompt_onboarding.md` e cole no Claude.

Responda todas as perguntas com o máximo de detalhe possível:
- Links do site e documentação
- Arquivos internos (PDFs, apresentações, roteiros)
- Como o negócio funciona
- Quais são as dúvidas mais comuns dos clientes

O Claude vai acessar os links, ler os arquivos e fazer perguntas de acompanhamento. Responda tudo.

### Passo 3 — Colar o Prompt de Construção

Quando o brainstorm estiver completo, copie o conteúdo de `02_prompt_construcao.md` e cole na mesma conversa.

O Claude vai gerar cinco arquivos personalizados para o negócio:
- System prompt do agente
- Base de conhecimento
- Regras de negócio e fluxos
- Guia técnico de implementação
- Plano de evolução

### Passo 4 — Salvar os Arquivos Gerados

Crie uma pasta para o projeto e salve cada arquivo gerado:

```
projetos/
└── nome-do-cliente/
    ├── system_prompt.md
    ├── base_conhecimento.md
    ├── regras_negocio.md
    ├── guia_implementacao.md
    └── plano_evolucao.md
```

### Passo 5 — Implementar com Claude Code

Abra o Claude Code no projeto do cliente e cole o "Prompt para Claude Code" que foi gerado dentro do guia de implementação. Ele vai criar:
- A Supabase Edge Function (webhook)
- As tabelas no banco de dados
- O componente React de atendimento

### Passo 6 — Configurar Z-API

No painel Z-API:

**6.1 — Conectar o número**
1. Criar a instância
2. Conectar via QRCode

**6.2 — Configurar webhook de recebimento**
1. Ir em "Webhooks e configurações gerais"
2. Colar a URL da Edge Function no campo "Ao receber":
   ```
   https://[seu-projeto].supabase.co/functions/v1/whatsapp-webhook
   ```
3. Salvar

**6.3 — Gerar o Client-Token (obrigatório)**

> ⚠️ Este passo é frequentemente esquecido e causa falha silenciosa no envio de mensagens.

1. No painel Z-API, acessar a aba **Segurança**
2. Localizar o módulo **"Token de Segurança da Conta"**
3. Clicar em **"Configurar Agora"** — isso gera o token
4. Copiar o token gerado
5. Clicar em **"Ativar Token"**

A partir desse momento, **todas as chamadas à API da Z-API precisam incluir o header `Client-Token`**. Sem ele, a Z-API retorna 403.

> **Importante:** O Client-Token da conta é **diferente** do token da instância que aparece na URL. São duas credenciais separadas.

### Passo 7 — Configurar variáveis de ambiente

**No arquivo `.env` do projeto (nunca commitar):**
```env
# Z-API — apenas server-side, nunca expor no frontend
ZAPI_INSTANCE_ID=sua_instancia_id
ZAPI_TOKEN=seu_token_da_instancia
ZAPI_SECURITY_TOKEN=seu_client_token_gerado_na_aba_seguranca
```

**Nos secrets da Supabase Edge Function:**

> ⚠️ As Edge Functions NÃO leem o `.env` do projeto. Os secrets precisam ser configurados separadamente no Supabase Dashboard.

1. Acessar: Supabase Dashboard → Edge Functions → [sua função] → Secrets
2. Adicionar **cada variável** manualmente:
   - `ZAPI_INSTANCE_ID`
   - `ZAPI_TOKEN`
   - `ZAPI_SECURITY_TOKEN`
   - `GEMINI_API_KEY`

Ou via Supabase Management API (para automação):
```bash
curl -X POST "https://api.supabase.com/v1/projects/[project-ref]/secrets" \
  -H "Authorization: Bearer [seu-pat]" \
  -H "Content-Type: application/json" \
  -d '[
    {"name": "ZAPI_INSTANCE_ID", "value": "..."},
    {"name": "ZAPI_TOKEN", "value": "..."},
    {"name": "ZAPI_SECURITY_TOKEN", "value": "..."},
    {"name": "GEMINI_API_KEY", "value": "..."}
  ]'
```

### Passo 8 — Testar

**Teste de envio (Z-API send-text):**
```bash
curl -X POST "https://api.z-api.io/instances/[ID]/token/[TOKEN]/send-text" \
  -H "Content-Type: application/json" \
  -H "Client-Token: [SEU_CLIENT_TOKEN]" \
  -d '{"phone": "5511999999999", "message": "Teste"}'
```
Deve retornar `{"zaapId":"...","messageId":"..."}`.

**Teste do webhook com payload real da Z-API:**
```bash
curl -X POST "https://[projeto].supabase.co/functions/v1/whatsapp-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ReceivedCallback",
    "phone": "5511999999999",
    "text": {"message": "Olá, como funciona?"},
    "senderName": "Teste",
    "fromMe": false,
    "isGroup": false,
    "isNewsletter": false
  }'
```

> ⚠️ O campo da mensagem é `text.message`, **não** `body`. Usar `body` faz a função ignorar todas as mensagens reais.

**Verificar no banco:**
- Checar tabela `whatsapp_conversas` — deve ter criado uma linha
- Checar tabela `whatsapp_mensagens` — deve ter user + agent
- Verificar no WhatsApp real se a resposta chegou

**Verificar rate limiting:**
- Enviar 6 mensagens seguidas — a 6ª deve retornar aviso

**Verificar escalada:**
- Enviar "quero falar com um humano" — status deve virar `escalado`

### Passo 9 — Go-live

Liberar o número para os clientes.

---

## Como Evoluir o Agente

Sempre que quiser melhorar o agente após o go-live:

1. Abra a conversa original do Claude (ou uma nova com os arquivos em mãos)
2. Cole o conteúdo de `03_prompt_atualizacao.md`
3. Informe o que quer atualizar
4. O Claude vai gerar os trechos atualizados
5. No painel do app → aba "Configurar Agente" → editar System Prompt e/ou Base de Conhecimento → Salvar

> Não é necessário redeploy para atualizar comportamento do agente. O backend lê os valores da tabela `whatsapp_config` a cada mensagem recebida.

---

## Boas Práticas

**Sobre a base de conhecimento:**
- Quanto mais exemplos reais de conversas, melhor
- Adicione toda nova dúvida respondida pelos atendentes humanos
- Revise os arquivos a cada 30 dias

**Sobre o system prompt:**
- Não torne as regras muito longas (aumenta o custo de tokens)
- Seja específico, não genérico
- Teste sempre após qualquer mudança

**Sobre segurança:**
- Nunca coloque senhas ou dados sensíveis nos arquivos `.md`
- Nunca exponha Instance ID, Token e Client-Token no frontend
- O `ZAPI_SECURITY_TOKEN` do `.env` **não** tem prefixo `VITE_` — é server-side
- Monitore os logs de conversa semanalmente

**Sobre custos:**
- Gemini 2.5 Flash: tier gratuito generoso para MVPs
- Com rate limiting de 5 msg/min por usuário, o custo é negligenciável no início
- Monitore consumo mensalmente no Google AI Studio

---

## Erros Comuns e Soluções

| Erro | Causa provável | Solução |
|------|---------------|---------|
| Mensagens chegam mas agente não responde | Campo `body` ao invés de `text.message` | Ler `payload.text.message` |
| Z-API retorna 403 | Client-Token ausente ou errado | Incluir `Client-Token` header nas chamadas |
| Edge Function retorna `BOOT_ERROR` | Import de esm.sh falhando | Usar fetch nativo na REST API do Supabase |
| Gemini retorna 404 | Modelo descontinuado | Usar `gemini-2.5-flash` |
| Secrets não disponíveis na Edge Function | Configurados só no `.env` | Adicionar nos secrets do Supabase Dashboard |
| Todas mensagens ignoradas | Filtro incorreto no payload | Verificar campos `type`, `fromMe`, `isGroup`, `text.message` |

---

## Para Usar em Outros Clientes

Este framework é reutilizável. Para cada novo cliente:

1. Abra uma conversa nova no Claude
2. Cole o `01_prompt_onboarding.md`
3. O Claude vai criar um agente completamente diferente, personalizado para aquele negócio
4. Salve os arquivos gerados em uma pasta separada para esse cliente

Os três prompts deste framework são os mesmos para todos os projetos. O que muda é o resultado — cada agente é único.

---

## Estrutura de Pastas Recomendada para Múltiplos Clientes

```
agente-framework/
├── README.md                        ← este arquivo
├── 01_prompt_onboarding.md          ← sempre o mesmo
├── 02_prompt_construcao.md          ← sempre o mesmo
├── 03_prompt_atualizacao.md         ← sempre o mesmo
│
└── clientes/
    ├── cliente-a/
    │   ├── system_prompt.md
    │   ├── base_conhecimento.md
    │   ├── regras_negocio.md
    │   └── guia_implementacao.md
    │
    ├── cliente-b/
    │   ├── system_prompt.md
    │   └── ...
    │
    └── cliente-c/
        └── ...
```

---

## Histórico de Versões

| Versão | Data | O que mudou |
|--------|------|-------------|
| 1.0 | Maio 2026 | Versão inicial do framework |
| 2.0 | Maio 2026 | Corrige payload Z-API (`text.message`), Client-Token, modelo Gemini 2.5 Flash, secrets Supabase, tabela de erros comuns |
