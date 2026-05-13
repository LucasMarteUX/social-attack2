# Design System — Post Creation Platform
*Extraído das referências visuais do BeetAI / 40By60*

---

## Visão Estética

A estética segue uma linguagem visual próxima à Apple: limpa, arejada, com hierarquia clara de informação. Os fundamentos são superfícies brancas ou levemente coloridas, tipografia legível em escala, bordas suaves e uma paleta funcional onde a cor carrega significado. Nenhum elemento é decorativo à toa — cada escolha visual serve à leitura de dados e ao conforto de uso prolongado.

**Princípios visuais:**
- Superfícies claras com baixa saturação de fundo
- Tipografia como protagonista da hierarquia
- Cor como sinalização semântica (não decoração)
- Espaço generoso entre elementos
- Cantos arredondados em todos os containers
- Sombras sutis para profundidade — nunca agressivas

---

## Tokens Primitivos

### Cores Primitivas

```
/* Família Roxa (Lavender) */
purple-50:   #F8EEFF
purple-100:  #EDD9FF
purple-200:  #D5AAFF
purple-300:  #BC7AFF
purple-600:  #7C3AED
purple-700:  #6D28D9
purple-800:  #5B21B6
purple-900:  #5B3F7A

/* Família Rosa (Beet) */
pink-50:     #FDE6EB
pink-100:    #FCCDD7
pink-200:    #F9A8B9
pink-600:    #BE185D
pink-800:    #9B1A4A
pink-900:    #7D2D3E

/* Família Verde (Lime) */
green-50:    #EEF4D0
green-100:   #DCE9A0
green-200:   #C4DC5A
green-500:   #84CC16
green-600:   #65A30D
green-700:   #4D7C0F
green-800:   #3A5C0B

/* Família Teal (Cyan) */
teal-50:     #DBF3F3
teal-100:    #B2E6E6
teal-200:    #7ACECE
teal-500:    #06B6D4
teal-600:    #0891B2
teal-700:    #0E7490
teal-800:    #1BA0A0

/* Família Coral (Sunset) */
coral-50:    #FAD9CF
coral-100:   #F6B8A5
coral-200:   #F08C70
coral-500:   #F97316
coral-600:   #EA580C
coral-700:   #E55A30
coral-800:   #C2410C

/* Neutros */
neutral-0:   #FFFFFF
neutral-50:  #FBFBFB
neutral-100: #F4F4F4
neutral-200: #E8E8E8
neutral-300: #D4D4D4
neutral-400: #A8A8A8
neutral-500: #737373
neutral-600: #525252
neutral-700: #3A3A3A
neutral-800: #262626
neutral-900: #1A1A1A

/* Vermelho (Crítico) */
red-50:      #FDE8E8
red-100:     #FECACA
red-500:     #EF4444
red-600:     #DC2626
red-700:     #B91C1C
red-800:     #991B1B
```

---

## Tokens Semânticos

### Cor de Fundo (Background)

```
/* Fundos de página e superfícies */
color-bg-page:           neutral-50     /* #FBFBFB — fundo global */
color-bg-surface:        neutral-0      /* #FFFFFF — cards e painéis */
color-bg-muted:          neutral-100    /* #F4F4F4 — áreas de menor destaque */
color-bg-lavender:       purple-50      /* #F8EEFF — fundo temático lavanda */
color-bg-beet:           pink-50        /* #FDE6EB — fundo temático rosa */

/* Hover e interação */
color-bg-hover:          neutral-100    /* #F4F4F4 */
color-bg-active:         neutral-200    /* #E8E8E8 */
color-bg-selected:       purple-50      /* #F8EEFF */
```

### Cor de Texto (Foreground)

```
color-text-primary:      neutral-900    /* #1A1A1A — corpo principal */
color-text-secondary:    neutral-500    /* #737373 — labels, meta */
color-text-tertiary:     neutral-400    /* #A8A8A8 — placeholders */
color-text-inverse:      neutral-0      /* #FFFFFF — texto sobre fundos escuros */
color-text-brand:        purple-700     /* #6D28D9 — links e ações primárias */
color-text-destructive:  red-600        /* #DC2626 — erros e alertas críticos */
```

### Cor de Status

```
/* On Track / Sucesso */
color-status-success-bg:    green-50       /* #EEF4D0 */
color-status-success-border: green-500     /* #84CC16 */
color-status-success-text:   green-700     /* #4D7C0F */

/* Doing Okay / Atenção moderada */
color-status-warning-bg:    teal-50        /* #DBF3F3 */
color-status-warning-border: teal-600      /* #0891B2 */
color-status-warning-text:   teal-700      /* #0E7490 */

/* Needs Attention / Alerta */
color-status-alert-bg:      coral-50       /* #FAD9CF */
color-status-alert-border:  coral-700      /* #E55A30 */
color-status-alert-text:    coral-800      /* #C2410C */

/* Critical / Crítico */
color-status-critical-bg:   red-50         /* #FDE8E8 */
color-status-critical-border: red-600      /* #DC2626 */
color-status-critical-text:  red-700       /* #B91C1C */
```

### Cor de Macro (Nutrição)

```
/* Usadas nas barras e gráficos de macros */
color-macro-carbs:      #F9A8B9    /* Rosa pastel — Carboidratos */
color-macro-protein:    #BBF7D0    /* Verde pastel — Proteína */
color-macro-fat:        #BAE6FD    /* Azul pastel — Gordura */
color-macro-fiber:      #FEF08A    /* Amarelo pastel — Fibra */
```

### Cor de Marca (Brand)

```
color-brand-primary:        purple-700     /* #6D28D9 */
color-brand-primary-hover:  purple-800     /* #5B21B6 */
color-brand-secondary:      pink-600       /* #BE185D */
color-brand-accent:         green-600      /* #65A30D */
```

### Cor de Borda (Border)

```
color-border-default:   rgba(0, 0, 0, 0.08)   /* Divisores sutis */
color-border-muted:     rgba(0, 0, 0, 0.05)   /* Separadores muito suaves */
color-border-strong:    neutral-300            /* #D4D4D4 */
color-border-brand:     purple-600             /* #7C3AED */
color-border-focus:     purple-600             /* #7C3AED — outline de foco */
```

---

## Tipografia

### Família Tipográfica

```
font-family-sans:    'IBM Plex Sans', system-ui, -apple-system, sans-serif
font-family-mono:    'IBM Plex Mono', 'Courier New', monospace
```

**IBM Plex Sans** — 18 estilos, suporte a variáveis. Projetada por Mike Abbink e Bold Monday. Escolhida por sua legibilidade em visualizações de dados densas e interfaces mobile. Combina caráter técnico com leveza humanista.

### Pesos

```
font-weight-regular:    400
font-weight-medium:     500
font-weight-semibold:   600
font-weight-bold:       700
```

### Escala de Tamanho

```
/* Números héros — métricas e scores */
font-size-display-2xl:  72px   /* Ex: Score "9", calorias "1,850" */
font-size-display-xl:   56px   /* Ex: métricas de destaque */
font-size-display-lg:   40px   /* Ex: números secundários */
font-size-display-md:   32px   /* Ex: valores de resumo */

/* Títulos */
font-size-heading-xl:   28px   /* H1 — títulos de página */
font-size-heading-lg:   24px   /* H2 — títulos de seção */
font-size-heading-md:   20px   /* H3 — subtítulos */
font-size-heading-sm:   18px   /* H4 — títulos de card */

/* Corpo */
font-size-body-lg:      16px   /* Corpo principal */
font-size-body-md:      14px   /* Corpo padrão */
font-size-body-sm:      13px   /* Texto auxiliar */

/* Utilitários */
font-size-label:        12px   /* Labels, metadata */
font-size-caption:      11px   /* Legendas, tooltips */
font-size-overline:     10px   /* Tags, categorias em caps */
```

### Altura de Linha (Line Height)

```
line-height-tight:      1.2    /* Números e displays */
line-height-snug:       1.35   /* Títulos */
line-height-normal:     1.5    /* Corpo de texto */
line-height-relaxed:    1.65   /* Texto longo */
```

### Espaçamento de Letras (Letter Spacing)

```
letter-spacing-tight:   -0.02em   /* Números grandes e displays */
letter-spacing-normal:   0em      /* Corpo */
letter-spacing-wide:     0.04em   /* Labels, overlines em caps */
letter-spacing-wider:    0.08em   /* Overlines */
```

---

## Espaçamento (Spacing)

Base: **4px**

```
space-0:    0px
space-1:    4px
space-2:    8px
space-3:    12px
space-4:    16px
space-5:    20px
space-6:    24px
space-8:    32px
space-10:   40px
space-12:   48px
space-16:   64px
space-20:   80px
space-24:   96px
```

### Padding Interno de Componentes

```
padding-card-sm:    16px 20px
padding-card-md:    20px 24px
padding-card-lg:    24px 32px

padding-button-sm:  6px 12px
padding-button-md:  8px 16px
padding-button-lg:  10px 20px

padding-badge:      2px 10px
padding-tag:        4px 12px
padding-input:      10px 14px
```

---

## Border Radius (Arredondamento)

```
radius-none:    0px
radius-xs:      4px    /* Elementos mínimos, inputs inline */
radius-sm:      6px    /* Tags pequenas */
radius-md:      8px    /* Botões, inputs */
radius-lg:      12px   /* Cards pequenos, dropdowns */
radius-xl:      16px   /* Cards principais */
radius-2xl:     20px   /* Painéis e modais */
radius-3xl:     24px   /* Componentes grandes */
radius-full:    9999px /* Badges, pills, chips */
radius-circle:  50%    /* Avatares, ícones circulares */
```

---

## Sombra (Shadow)

Sombras suaves, multicamadas — nunca escuras ou com grande offset. Evocam profundidade sutil, no espírito Apple.

```
shadow-none:    none

shadow-xs:      0 1px 2px rgba(0, 0, 0, 0.04)

shadow-sm:      0 1px 3px rgba(0, 0, 0, 0.06),
                0 1px 2px rgba(0, 0, 0, 0.04)

shadow-md:      0 4px 6px rgba(0, 0, 0, 0.06),
                0 2px 4px rgba(0, 0, 0, 0.04)

shadow-lg:      0 10px 15px rgba(0, 0, 0, 0.07),
                0 4px 6px rgba(0, 0, 0, 0.04)

shadow-xl:      0 20px 25px rgba(0, 0, 0, 0.08),
                0 10px 10px rgba(0, 0, 0, 0.04)

shadow-modal:   0 24px 48px rgba(0, 0, 0, 0.12),
                0 8px 16px rgba(0, 0, 0, 0.06)

/* Sombra colorida (brand) */
shadow-brand:   0 4px 14px rgba(109, 40, 217, 0.25)
```

---

## Stroke (Borda)

### Espessura

```
stroke-none:    0px
stroke-xs:      0.5px   /* Separadores muito sutis */
stroke-sm:      1px     /* Padrão — cards, inputs */
stroke-md:      1.5px   /* Bordas de destaque */
stroke-lg:      2px     /* Bordas de foco ou seleção */
stroke-xl:      3px     /* Elementos críticos */
```

### Estilo

```
stroke-style-solid:   solid
stroke-style-dashed:  dashed
stroke-style-dotted:  dotted
```

### Tokens Semânticos de Borda

```
border-card:         1px solid rgba(0, 0, 0, 0.06)
border-input:        1px solid neutral-200        /* #E8E8E8 */
border-input-focus:  1.5px solid purple-600       /* #7C3AED */
border-input-error:  1.5px solid red-600          /* #DC2626 */
border-divider:      1px solid neutral-100        /* #F4F4F4 */
border-strong:       1px solid neutral-300        /* #D4D4D4 */
border-brand:        1.5px solid purple-600       /* #7C3AED */
```

---

## Componentes Visuais

### Cards

```
card-default:
  background:     neutral-0         (#FFFFFF)
  border:         border-card
  border-radius:  radius-xl          (16px)
  shadow:         shadow-sm
  padding:        padding-card-md

card-elevated:
  background:     neutral-0
  border:         none
  border-radius:  radius-xl
  shadow:         shadow-md
  padding:        padding-card-md

card-muted:
  background:     neutral-50        (#FBFBFB)
  border:         border-divider
  border-radius:  radius-lg          (12px)
  shadow:         shadow-none
  padding:        padding-card-sm

card-colored (lavender):
  background:     purple-50         (#F8EEFF)
  border:         none
  border-radius:  radius-xl
  shadow:         shadow-sm

card-colored (beet):
  background:     pink-50           (#FDE6EB)
  border:         none
  border-radius:  radius-xl
  shadow:         shadow-sm
```

### Botões

```
button-primary:
  background:       purple-700       (#6D28D9)
  text:             neutral-0
  border:           none
  border-radius:    radius-md         (8px)
  padding:          padding-button-md
  font-size:        font-size-body-md (14px)
  font-weight:      font-weight-semibold
  hover-background: purple-800       (#5B21B6)
  shadow:           shadow-brand

button-secondary:
  background:       neutral-0
  text:             purple-700
  border:           border-brand
  border-radius:    radius-md
  padding:          padding-button-md
  font-weight:      font-weight-medium
  hover-background: purple-50

button-ghost:
  background:       transparent
  text:             neutral-600
  border:           none
  border-radius:    radius-md
  padding:          padding-button-md
  hover-background: neutral-100

button-destructive:
  background:       red-600
  text:             neutral-0
  border:           none
  border-radius:    radius-md
```

### Badges e Pills

```
badge-success:
  background:     green-50     (#EEF4D0)
  text:           green-700    (#4D7C0F)
  border:         none
  border-radius:  radius-full
  padding:        padding-badge
  font-size:      font-size-label (12px)
  font-weight:    font-weight-semibold

badge-warning:
  background:     teal-50      (#DBF3F3)
  text:           teal-700     (#0E7490)
  border-radius:  radius-full

badge-alert:
  background:     coral-50     (#FAD9CF)
  text:           coral-800    (#C2410C)
  border-radius:  radius-full

badge-critical:
  background:     red-50       (#FDE8E8)
  text:           red-700      (#B91C1C)
  border-radius:  radius-full

badge-neutral:
  background:     neutral-100  (#F4F4F4)
  text:           neutral-600  (#525252)
  border-radius:  radius-full
```

### Inputs

```
input-default:
  background:     neutral-0
  border:         border-input
  border-radius:  radius-md        (8px)
  padding:        padding-input    (10px 14px)
  font-size:      font-size-body-md
  text:           neutral-900
  placeholder:    neutral-400

input-focus:
  border:         border-input-focus

input-error:
  border:         border-input-error
  background:     red-50
```

### Navegação (Nav Bar)

```
nav-background:       neutral-0 / blur(backdrop)
nav-border-bottom:    border-divider
nav-height:           56px (desktop) / 48px (mobile)
nav-item-active-bg:   purple-50
nav-item-active-text: purple-700
nav-item-text:        neutral-500
nav-item-border-radius: radius-full
```

### Alertas e Notificações

```
alert-info:
  background:   purple-50
  border-left:  3px solid purple-600
  icon-color:   purple-600
  text:         purple-900

alert-success:
  background:   green-50
  border-left:  3px solid green-600

alert-warning:
  background:   coral-50
  border-left:  3px solid coral-700

alert-critical:
  background:   red-50
  border-left:  3px solid red-600
```

### Avatares

```
avatar-sm:    24px  (border-radius: radius-circle)
avatar-md:    32px
avatar-lg:    40px
avatar-xl:    56px
avatar-2xl:   80px
```

---

## Iconografia

- Estilo: outline/stroke fino, ponta arredondada
- Família recomendada: Lucide Icons ou SF Symbols (estética Apple)
- Tamanhos: 16px, 20px, 24px
- Cor padrão: herda `color-text-secondary`
- Cor em estado ativo: `color-brand-primary`
- Stroke width: 1.5px (fino, elegante)

---

## Gráficos e Visualizações

### Gráficos de Donut / Arco

```
chart-track-bg:         neutral-100       (#F4F4F4)
chart-stroke-width:     12px–16px (desktop), 8px–10px (mobile)
chart-end-cap:          round
chart-gap:              2px entre segmentos
```

### Barras de Macro

```
bar-carbs:      #F9A8B9   Rosa suave
bar-protein:    #86EFAC   Verde suave
bar-fat:        #93C5FD   Azul suave
bar-fiber:      #FDE68A   Amarelo suave
bar-height:     6px–8px
bar-radius:     radius-full
bar-bg:         neutral-100
```

### Gráficos de Linha / Área

```
line-primary:       purple-600    (#7C3AED)
line-secondary:     pink-400      (#F472B6)
area-fill-opacity:  0.12
line-stroke-width:  2px
```

### AI Insight Cards

```
ai-card-background:   pink-50 / purple-50 (alternados)
ai-card-border:       none
ai-card-radius:       radius-lg (12px)
ai-card-padding:      12px 16px
ai-label-size:        font-size-label (12px)
ai-label-weight:      font-weight-semibold
ai-text-size:         font-size-body-md (14px)
ai-text-style:        italic (sugerido)
```

---

## Grid e Layout

### Grid Principal

```
grid-columns-mobile:    1
grid-columns-tablet:    2
grid-columns-desktop:   12
grid-gutter:            16px (mobile) / 24px (desktop)
grid-margin:            16px (mobile) / 40px (desktop)
max-width-content:      1280px
```

### Breakpoints

```
breakpoint-mobile:      < 640px
breakpoint-tablet:      640px – 1024px
breakpoint-desktop:     > 1024px
```

---

## Duração e Animação

```
duration-instant:   0ms
duration-fast:      100ms
duration-normal:    200ms
duration-slow:      300ms
duration-slower:    500ms

easing-default:     cubic-bezier(0.4, 0, 0.2, 1)   /* ease-in-out suave */
easing-spring:      cubic-bezier(0.34, 1.56, 0.64, 1) /* leve spring */
easing-out:         cubic-bezier(0, 0, 0.2, 1)
```

---

## Referências Visuais Chave

| Elemento            | Token Aplicado                                 |
|---------------------|------------------------------------------------|
| Fundo de página     | `neutral-50` (#FBFBFB)                         |
| Card padrão         | `neutral-0` + `shadow-sm` + `radius-xl`        |
| Botão principal     | `purple-700` + `shadow-brand`                  |
| Badge "On Track"    | `green-50` text `green-700`                    |
| Badge "Needs Attention" | `coral-50` text `coral-800`               |
| Badge "Critical"    | `red-50` text `red-700`                        |
| Fonte principal     | IBM Plex Sans, Regular/Semibold                |
| Número hero (score) | 72px, Semibold, letter-spacing -0.02em         |
| AI Insight          | `pink-50`, italic, 14px                        |
| Borda de card       | 1px solid rgba(0,0,0,0.06)                     |
| Sombra de modal     | `shadow-modal`                                 |

---

*Este arquivo é específico para a estética e tokens visuais do sistema de criação de posts. Não inclui lógica de funcionalidade ou componentes interativos — esses serão documentados separadamente.*
