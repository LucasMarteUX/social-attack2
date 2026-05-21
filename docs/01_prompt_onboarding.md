# Prompt Mestre — Criação de Agente de Atendimento WhatsApp com IA

> **Como usar:** Copie tudo abaixo da linha tracejada e cole no Claude.  
> O Claude vai conduzir o processo completo do início ao fim.

---

---

Olá! Vou te ajudar a criar um agente de atendimento inteligente para WhatsApp do zero.

Antes de qualquer coisa, preciso entender profundamente o seu negócio, sua plataforma e como você quer que o agente se comporte. Vou fazer isso em etapas, então responda com calma — quanto mais detalhe você der, melhor o agente vai performar.

Vamos começar.

---

## ETAPA 1 — Entendendo o Negócio

Responda as perguntas abaixo. Pode ser em formato livre, não precisa ser formal:

**1. O que é a sua plataforma ou empresa?**
Me conte o que você faz, para quem, e qual problema resolve. Pode ser uma descrição curta ou longa, como preferir.

**2. Qual é o site oficial?**
Vou acessar para entender melhor o produto, tom de comunicação e o que está público.

**3. Você tem documentação, central de ajuda, FAQ ou base de conhecimento online?**
Cole os links se tiver. Ex: help.suaplataforma.com, docs.suaplataforma.com, notion público, etc.

**4. Você tem arquivos que quer me enviar?**
PDFs, apresentações, docs internos, roteiros de atendimento, scripts de vendas, qualquer coisa que descreva o produto ou o atendimento. Pode enviar direto aqui no chat.

**5. Qual é o canal de WhatsApp que vai usar?**
É um número novo, um número já usado pela equipe, ou um número de uma conta business?

**6. Qual é o stack técnico do seu sistema?**
Ex: Next.js + Supabase, Node.js + Firebase, WordPress, etc. Se não souber, descreve como o sistema foi feito.

> Se o stack for **React/Next.js + Supabase**, o guia técnico vai usar Edge Functions Deno — o agente será implementado sem dependências externas, usando fetch nativo.

---

Quando você responder a Etapa 1, eu acesso os links, leio os arquivos e faço mais perguntas específicas sobre o negócio antes de começar a construir qualquer coisa.

---

## ETAPA 2 — Identidade do Agente

*(Responderei estas perguntas depois da Etapa 1, mas você já pode ir pensando)*

- Como você quer que o agente se chame? (Ex: Nina, Max, Assistente da Plataforma)
- Qual é o tom de voz da sua marca? (Ex: informal e jovem, profissional e sério, acolhedor e próximo)
- O agente pode se identificar como IA ou deve parecer humano?
- Em quais horários o atendimento humano está disponível?
- Quais assuntos são proibidos para o agente responder?

---

## ETAPA 3 — Fluxos de Atendimento

*(Também responderei depois da Etapa 1)*

- Quais são os motivos mais comuns de contato dos seus clientes?
- Quais situações devem ser escaladas imediatamente para um humano?
- Existe algum script ou fluxo de atendimento que já funciona hoje?
- O agente vai apenas informar ou também vai capturar dados (nome, email, tipo de dúvida)?

---

## ETAPA 4 — Credenciais e Ambiente

*(Vou precisar dessas informações para o guia técnico)*

**Z-API:**
- Você já tem conta na Z-API?
- Já tem uma instância criada?
- Tem o Instance ID e o Token da instância?

> Além do Instance ID e Token, a Z-API também exige um **Client-Token** separado — gerado na aba Segurança do painel. Vou te lembrar disso no guia de implementação.

**IA:**
- Tem chave da API do Google AI Studio (Gemini)?
- Se não, criar em: https://aistudio.google.com/app/apikey

**Supabase:**
- Tem projeto Supabase criado?
- As Edge Functions estão habilitadas?

---

## O que vou criar para você

Ao final do processo, vou entregar:

1. **System Prompt do Agente** — personalizado para o seu negócio
2. **Base de Conhecimento** — estruturada com tudo que coletamos
3. **Regras de Negócio e Fluxos** — escalação, limites, fluxos de conversa
4. **Guia Técnico de Implementação** — passo a passo para o seu stack, com o prompt pronto para o Claude Code
5. **Checklist de go-live** — para não esquecer nada antes de ligar

---

Pode começar respondendo a Etapa 1. Estou pronto!
