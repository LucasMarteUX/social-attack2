# CLAUDE.md — Diretrizes de Desenvolvimento · Social Attack

## Visão Geral
Sistema de criação e gestão de criativos para redes sociais, com IA integrada (Claude + Gemini). Frontend React + TypeScript + Tailwind. Backend: Supabase (PostgreSQL). O projeto é totalmente componentizado e conectado ao banco via hooks customizados.

---

## Otimização de Tokens (LEIA PRIMEIRO)

- **Responda apenas o necessário.** Não explique o que o código faz — o código é autoexplicativo.
- **Analise somente os arquivos relevantes ao contexto.** Não leia arquivos que não impactam a tarefa atual.
- **Sem comentários desnecessários no código.** Apenas documente o "porquê", nunca o "o quê".
- **Sem resumos ao final de cada resposta.** O usuário vê o diff — não repita o que acabou de fazer.
- **Prefira edições pontuais (Edit)** a reescrever arquivos inteiros (Write).
- Antes de implementar, leia os tipos em `src/data/mock.ts` e os hooks em `src/hooks/` para entender o contrato de dados.

---

## Componentização — Regras Obrigatórias

### Antes de criar qualquer componente, verifique:
1. `src/components/ui/` — componentes de interface genéricos (Button, Card, Badge, Input, Modal, Spinner, Toast, StatCard, DonutChart, SectionHeader, AIInsightCard)
2. `src/components/layout/` — estrutura de tela (AppLayout, Sidebar, NavItem, MobileDrawer)
3. `src/components/categorias/`, `criativos/`, `ideias/` — componentes de domínio

### Regras:
- **Nunca duplique** um componente que já existe. Estenda via props se precisar de variação.
- **Componentes de UI** em `src/components/ui/` são genéricos e reutilizáveis — não coloque lógica de negócio neles.
- **Componentes de domínio** (ex: `CriativoCard`) consomem hooks e tipos do domínio.
- Novos componentes de UI devem aceitar `className?: string` para extensão via Tailwind.
- Ícones: use exclusivamente `lucide-react`.

---

## Stack e Convenções

### Tecnologias
- **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v3** — utility-first, sem CSS modules
- **React Router DOM v7** — rotas em `src/router.tsx`
- **Supabase** — cliente em `src/lib/supabase.ts`
- **Vite v6** — variáveis de ambiente via `import.meta.env.VITE_*`

### Estrutura de pastas
```
src/
  components/
    ui/          # Componentes genéricos reutilizáveis
    layout/      # AppLayout, Sidebar, NavItem, MobileDrawer
    categorias/  # CategoryCard, CategoryForm
    criativos/   # CriativoCard, BriefingForm, SlideEditor, SlideCarousel, SlidePreview
    ideias/      # IdeaCard, IdeaForm
  hooks/         # useCategorias, useCriativos, useIdeias, useTodos, useAgenda, useTomDeVoz
  lib/           # supabase.ts, claude.ts, gemini.ts
  pages/         # Uma página por rota
  data/          # mock.ts — interfaces TypeScript do domínio
  router.tsx     # Definição de rotas
```

### Padrões de código
- **Hooks customizados** em `src/hooks/` encapsulam toda lógica de dados (Supabase + estado).
- **Páginas** (`src/pages/`) são composições de componentes — sem lógica de dados direta.
- **Tipos** em `src/data/mock.ts` são a fonte de verdade das interfaces.
- Props de componentes: defina a interface `Props` logo acima do componente.
- Sem `any` — use tipos explícitos ou `unknown`.
- Imports ordenados: 1) React, 2) libs externas, 3) componentes locais, 4) hooks, 5) tipos.

---

## Banco de Dados (Supabase)

- Credenciais em `.env` — nunca commitar com valores reais.
- Schema completo em `prisma/schema.prisma` e detalhado em `schema-prisma.md`.
- Tabelas principais: `categorias`, `ideias`, `criativos`, `agendamentos`, `todos`, `tons_de_voz`.
- Use sempre `.select()` explícito — nunca `select('*')` em produção, exceto em `count`.
- Erros do Supabase: propague via `throw new Error(error.message)` nos hooks.

---

## IA (Claude + Gemini)

- Cliente Anthropic em `src/lib/claude.ts` — use para geração de texto/criativos.
- Cliente Gemini em `src/lib/gemini.ts` — use para análise de imagens.
- Chaves via `import.meta.env.VITE_ANTHROPIC_API_KEY` e `VITE_GEMINI_API_KEY`.
- Chamadas de IA sempre em hooks ou funções de serviço — nunca diretamente em componentes.

---

## Proporção de Posts

Cards de criativo respeitam proporção **1080×1350px (4:5)** — equivalente a `aspect-[4/5]` no Tailwind. Nunca altere essa proporção sem alinhamento explícito.

---

## Git

- Commits em português, prefixo: `feat:`, `fix:`, `refactor:`, `chore:`.
- Não commitar: `node_modules/`, `dist/`, `.env`.
- Não usar `--no-verify`.
