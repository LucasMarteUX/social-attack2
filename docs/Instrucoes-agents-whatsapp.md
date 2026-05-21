# Framework de Agente de Atendimento WhatsApp com IA

**Por:** Lucas  
**Versão:** 1.0 — Maio 2026

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
   Claude Code cria o webhook, as tabelas, o componente React
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
- A rota do webhook
- As tabelas no banco de dados
- O componente React de atendimento

### Passo 6 — Configurar Z-API

No painel Z-API:
1. Conectar o número via QRCode
2. Ir em "Webhooks e configurações gerais"
3. Colar a URL do webhook no campo "Ao receber"
4. Salvar

### Passo 7 — Testar

Antes de liberar para clientes:
1. Testar com Postman enviando mensagens simuladas
2. Testar com seu próprio WhatsApp
3. Verificar se as conversas estão aparecendo no Supabase
4. Verificar se o rate limiting está funcionando
5. Verificar se a escalada para humano está funcionando

### Passo 8 — Go-live

Liberar o número para os clientes.

---

## Como Evoluir o Agente

Sempre que quiser melhorar o agente após o go-live:

1. Abra a conversa original do Claude (ou uma nova com os arquivos em mãos)
2. Cole o conteúdo de `03_prompt_atualizacao.md`
3. Informe o que quer atualizar
4. O Claude vai gerar os trechos atualizados
5. Substitua nos arquivos correspondentes
6. O agente já usa as novas regras na próxima mensagem recebida

> Não é necessário redeploy para atualizar o agente, pois o backend lê os arquivos `.md` a cada requisição.

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
- Não exponha Instance ID e Token da Z-API no frontend
- Monitore os logs de conversa semanalmente

**Sobre custos:**
- Gemini 1.5 Flash: gratuito até 50 req/min, depois ~$0.075/1M tokens
- Com rate limiting de 5 msg/min por usuário, o custo é negligenciável no MVP
- Monitore consumo mensalmente no Google AI Studio

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
