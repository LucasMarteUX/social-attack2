# PRD — Social Attack
**Product Requirements Document**
*Versão 1.0 — Maio 2026*

---

## 1. Visão Geral

**Social Attack** é uma plataforma web de criação e gestão de conteúdo para redes sociais. O sistema funciona como um "cérebro criativo" centralizado: o usuário organiza referências, gera ideias por categoria e transforma essas ideias em conteúdo publicável — com texto gerado via Claude API e imagens geradas via Gemini API.

O foco inicial é a produção de carrosséis para o Instagram, mas a arquitetura de categorias e biblioteca de ideias é extensível para outros formatos.

**Nome do produto:** Social Attack
**Status:** Em desenvolvimento — v1 sem autenticação
**Design System:** `designsystem.md` (já documentado)

---

## 2. Problema que Resolve

Criadores de conteúdo e times de marketing não têm um lugar único para organizar referências, brainstormar ideias e gerar conteúdo de forma estruturada. O processo atual é fragmentado: ideias num doc, referências salvas em abas do browser, imagens geradas em ferramentas separadas, agenda em outro app.

O Social Attack une tudo isso numa única interface.

---

## 3. Público-Alvo

- Criadores de conteúdo solo
- Social media managers
- Times de marketing pequenos e médios
- Agências que gerenciam múltiplos perfis

---

## 4. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React + Tailwind CSS |
| Banco de Dados | Supabase (PostgreSQL) |
| Geração de Texto | Claude API (Anthropic) |
| Geração de Imagens | Gemini API (Google — Imagen) |
| Versionamento | GitHub |
| Deploy | Vercel |
| Autenticação | Nenhuma na v1 — sistema aberto |

---

## 5. Layout Global

O sistema segue um layout de **dashboard com dois painéis fixos**:

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (fixo, não escrola)  │  CONTEÚDO (escrola) │
│                               │                     │
│  [Logo Social Attack]         │  ← área de trabalho │
│                               │                     │
│  • Categorias                 │                     │
│  • Biblioteca de Ideias       │                     │
│  • Criativos                  │                     │
│  • Agenda de Posts            │                     │
│  • To-Do                      │                     │
│                               │                     │
└─────────────────────────────────────────────────────┘
```

- **Sidebar esquerdo:** fixo, largura ~240px, não acompanha scroll
- **Área de conteúdo:** ocupa o restante da tela, com scroll vertical independente
- **Responsivo:** no mobile, o sidebar vira um menu deslizante (drawer)

---

## 6. Módulos do Sistema

---

### 6.1 Categorias

**Objetivo:** Organizar o conteúdo por temas. Cada categoria é um universo temático do qual nascem as ideias e os conteúdos.

**Funcionalidades:**
- Criar nova categoria (nome + cor + ícone opcional)
- Editar e excluir categorias existentes
- Visualizar todas as categorias em cards na área de conteúdo
- Cada categoria exibe: nome, quantidade de ideias, quantidade de conteúdos gerados
- Clicar em uma categoria abre sua biblioteca de ideias interna

**Campos de uma categoria:**
```
- id (uuid)
- nome (texto)
- descricao (texto, opcional)
- cor (hex — usado no card e nos badges)
- icone (string — nome do ícone Lucide)
- criado_em (timestamp)
```

**UX:**
- Cards em grid (2 colunas no desktop, 1 no mobile)
- Botão "Nova categoria" fixo no topo da área de conteúdo
- Cor da categoria reflete no card e nos itens ligados a ela

---

### 6.2 Biblioteca de Ideias

**Objetivo:** Repositório de ideias geradas dentro de cada categoria. Funciona como o "brainstorm" organizado do sistema.

**Funcionalidades:**
- Criar ideia manualmente (título + descrição)
- Gerar ideias automaticamente via Claude API com base no tema da categoria e nas referências adicionadas
- Editar e excluir ideias
- Marcar ideia como "favorita"
- Filtrar ideias por: todas, favoritas, com conteúdo gerado, sem conteúdo
- A partir de uma ideia, iniciar a geração de conteúdo (carrossel)

**Campos de uma ideia:**
```
- id (uuid)
- categoria_id (fk)
- titulo (texto)
- descricao (texto)
- favorita (boolean)
- referencias (array de objetos: tipo + valor)
- conteudo_gerado (boolean)
- criado_em (timestamp)
```

**Referências dentro de uma ideia:**
- URL manual (colada pelo usuário)
- Texto livre (anotação, citação, contexto)
- URL de pesquisa automática (o sistema busca conteúdo da URL com WebFetch e sumariza via Claude)

---

### 6.3 Criativos

**Objetivo:** Geração e gestão do conteúdo visual e textual publicável. O "produto final" do sistema.

#### 6.3.1 Criação de Carrossel

O usuário parte de uma ideia da biblioteca e inicia o fluxo de geração de carrossel:

**Etapas do fluxo:**
1. **Briefing** — usuário define: tema, tom de voz, quantidade de slides, público-alvo, call-to-action
2. **Geração de texto** — Claude API gera o roteiro do carrossel (título, texto de cada slide, legenda do post)
3. **Revisão** — usuário edita o texto gerado antes de avançar
4. **Geração de imagens** — Gemini API (Imagen) gera a imagem de capa e imagens dos slides com base no texto e no estilo definido
5. **Exportação** — download das imagens geradas + texto da legenda

**Campos de um criativo:**
```
- id (uuid)
- ideia_id (fk)
- categoria_id (fk)
- titulo (texto)
- tipo (enum: carrossel, imagem_unica, reels_roteiro)
- status (enum: rascunho, revisao, pronto, agendado, publicado)
- slides (array de objetos: texto + url_imagem_gerada)
- legenda (texto)
- hashtags (array de strings)
- prompt_imagem (texto — prompt enviado ao Gemini)
- criado_em (timestamp)
- atualizado_em (timestamp)
```

#### 6.3.2 Tom de Voz

Opções pré-definidas (selecionáveis no briefing):
- Educativo
- Inspiracional
- Provocador
- Direto e objetivo
- Humorístico
- Storytelling

#### 6.3.3 Visualização de Criativos

- Grid de cards com preview do criativo
- Filtros: por categoria, por status, por tipo
- Indicador de status com badge colorido (seguindo tokens de status do design system)

---

### 6.4 Agenda de Posts

**Objetivo:** Planejar quando cada criativo será publicado.

**Funcionalidades:**
- Visualização em calendário mensal
- Atribuir criativo a uma data/horário
- Status do agendamento: agendado, publicado, cancelado
- Visualização alternativa em lista (cronológica)
- Cada item da agenda mostra: título do criativo, categoria (com cor), data, horário, status

**Campos de um agendamento:**
```
- id (uuid)
- criativo_id (fk)
- data_publicacao (datetime)
- plataforma (enum: instagram, linkedin, twitter — extensível)
- status (enum: agendado, publicado, cancelado)
- notas (texto, opcional)
```

**UX:**
- Calendário com destaque visual por categoria (usa a cor da categoria no evento)
- Clicar no evento abre o criativo atrelado
- Botão "Agendar" disponível dentro da tela de cada criativo

---

### 6.5 To-Do

**Objetivo:** Checklist de tarefas relacionadas ao fluxo de trabalho de conteúdo. Simples, rápido e sempre visível.

**Funcionalidades:**
- Criar nova tarefa (título + prazo opcional + prioridade)
- Marcar tarefa como concluída
- Editar tarefa existente
- Excluir tarefa
- Filtrar por: todas, pendentes, concluídas
- Ordenar por: data de criação, prazo, prioridade

**Campos de uma tarefa:**
```
- id (uuid)
- titulo (texto)
- concluida (boolean)
- prazo (date, opcional)
- prioridade (enum: baixa, media, alta)
- criado_em (timestamp)
```

**UX:**
- Lista vertical com checkbox à esquerda
- Tarefa concluída recebe linha cortada no texto (text-decoration: line-through)
- Badge de prioridade colorido (alta = coral, média = teal, baixa = neutral)
- Prazo próximo (< 24h) exibe indicador de urgência

---

## 7. Integrações de IA

### 7.1 Claude API — Geração de Texto

Usado em:
- Geração de ideias a partir de uma categoria + referências
- Geração do roteiro completo do carrossel (slides + legenda + hashtags)
- Sumarização de URLs de referência coladas pelo usuário
- Sugestão de títulos alternativos para uma ideia

**Parâmetros configuráveis pelo sistema:**
- Tom de voz
- Quantidade de slides
- Público-alvo
- Call-to-action desejado

### 7.2 Gemini API (Imagen) — Geração de Imagens

Usado em:
- Geração das imagens dos slides do carrossel
- Imagem de capa do post

**Fluxo:**
1. Sistema monta o prompt de imagem com base no texto do slide + estilo visual definido pelo usuário
2. Gemini retorna imagem(ns) via API
3. Imagens são armazenadas no Supabase Storage
4. URLs retornam para o criativo no banco de dados

---

## 8. Banco de Dados — Supabase

### Tabelas Principais

```sql
categorias
  id uuid PK
  nome text
  descricao text
  cor text
  icone text
  criado_em timestamptz

ideias
  id uuid PK
  categoria_id uuid FK -> categorias.id
  titulo text
  descricao text
  favorita boolean default false
  referencias jsonb
  conteudo_gerado boolean default false
  criado_em timestamptz

criativos
  id uuid PK
  ideia_id uuid FK -> ideias.id
  categoria_id uuid FK -> categorias.id
  titulo text
  tipo text
  status text
  slides jsonb
  legenda text
  hashtags text[]
  prompt_imagem text
  criado_em timestamptz
  atualizado_em timestamptz

agenda
  id uuid PK
  criativo_id uuid FK -> criativos.id
  data_publicacao timestamptz
  plataforma text
  status text
  notas text
  criado_em timestamptz

todos
  id uuid PK
  titulo text
  concluida boolean default false
  prazo date
  prioridade text
  criado_em timestamptz
```

### Storage

```
bucket: criativos-imagens
  /slides/{criativo_id}/{slide_index}.png
  /capas/{criativo_id}/capa.png
```

---

## 9. Design e Interface

O sistema segue integralmente o **`designsystem.md`** já documentado. Destaques de aplicação:

| Elemento | Aplicação |
|---|---|
| Sidebar | `neutral-0` + `border-right: border-divider` + `shadow-sm` |
| Cards de categoria | Cor da categoria como `border-left` ou badge |
| Badges de status | Tokens semânticos: success, warning, alert, critical |
| Botão principal | `color-brand-primary` (purple-700) |
| Tipografia hero | IBM Plex Sans Semibold |
| Fundo da área de conteúdo | `neutral-50` (#FBFBFB) |
| Cards de criativo | `neutral-0` + `shadow-sm` + `radius-xl` |

---

## 10. Navegação — Sidebar

```
[Logo Social Attack]

──────────────────
  Conteúdo
──────────────────
  📁 Categorias
  💡 Biblioteca de Ideias
  🎨 Criativos

──────────────────
  Planejamento
──────────────────
  📅 Agenda
  ✅ To-Do
```

---

## 11. Fora do Escopo — v1

Os itens abaixo **não serão desenvolvidos** nesta versão:

- Autenticação e múltiplos usuários
- Publicação direta nas redes sociais (apenas geração e agendamento manual)
- Análise de métricas de posts publicados
- Colaboração em tempo real
- Planos pagos / billing
- Aplicativo mobile nativo
- Integração com Canva ou outras ferramentas de design externas

---

## 12. Critérios de Sucesso — v1

- Usuário consegue criar uma categoria, gerar ideias nela e produzir um carrossel completo (texto + imagens) em menos de 10 minutos
- Todas as imagens geradas são armazenadas e recuperáveis
- O sistema funciona sem autenticação, com dados persistidos no Supabase
- Interface responsiva: usável no desktop e no mobile
- Design consistente com o `designsystem.md`

---

## 13. Próximos Passos

1. Configurar projeto no GitHub + Vercel
2. Inicializar projeto React + Tailwind
3. Configurar Supabase (tabelas + storage)
4. Implementar layout base (sidebar + área de conteúdo)
5. Módulo de Categorias (CRUD completo)
6. Módulo de Biblioteca de Ideias + integração Claude API
7. Módulo de Criativos + integração Gemini API
8. Módulo de Agenda
9. Módulo de To-Do
10. Testes, ajustes de UI e deploy na Vercel

---

*Social Attack — PRD v1.0 | Maio 2026*
