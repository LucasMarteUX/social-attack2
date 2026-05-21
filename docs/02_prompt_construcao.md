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

Crie o system prompt completo que será injetado na API de IA (Gemini, Claude ou GPT) a cada mensagem recebida.

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
- Placeholder para dados do usuário (se houver): `{{DADOS_USUARIO}}`

**Regras de escalada**
- Liste as situações exatas em que o agente deve encaminhar para humano
- A mensagem exata que deve enviar ao escalar

**Mensagens padrão**
- Boas-vindas (primeiro contato)
- Fora do escopo
- Escalada para humano
- Rate limiting atingido
- Erro técnico
- Encerramento positivo

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
- Máximo de mensagens por minuto por usuário
- Máximo de mensagens por hora por usuário
- Tamanho máximo de mensagem aceita
- Horário de atendimento humano disponível

---

## ARQUIVO 4 — Guia Técnico de Implementação

Com base no stack informado, crie um guia passo a passo de implementação contendo:

**Estrutura de arquivos recomendada**
Mostre como organizar o projeto para suportar o agente.

**Tabelas do banco de dados**
SQL ou estrutura equivalente para:
- Tabela de conversas
- Tabela de rate limiting
- Tabela de escaladas (opcional)

**Configuração do webhook Z-API**
Passo a passo de onde clicar no painel Z-API e o que configurar.

**Variáveis de ambiente necessárias**
Lista completa de todas as variáveis que o projeto vai precisar.

**Prompt exato para o Claude Code**
Escreva o prompt completo, pronto para copiar e colar no Claude Code, pedindo para ele criar a rota do webhook com todas as especificações do projeto.

**Checklist de go-live**
Lista de verificação antes de ligar o agente em produção.

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
