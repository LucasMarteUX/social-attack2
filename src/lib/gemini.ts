import type { CarouselSlide, SlideStyles } from '../data/mock'
import { DEFAULT_SLIDE_STYLES } from '../data/mock'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

// gemini-2.5-flash: modelo estável para geração de texto (substitui gemini-2.0-flash)
const GEMINI_TEXT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

const GEMINI_IMAGE_PREDICT = 'https://generativelanguage.googleapis.com/v1beta/models'

/** Ordem: qualidade → velocidade. Evita imagen-3.x (indisponível em :predict no v1beta). */
const IMAGEN_MODEL_IDS = ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001'] as const

const IMAGEN_PROMPT_FALLBACK_MAX = 720

function simplifyImagenPrompt(full: string): string {
  const t = full.trim()
  if (t.length <= IMAGEN_PROMPT_FALLBACK_MAX) return t
  const head = t.slice(0, IMAGEN_PROMPT_FALLBACK_MAX).trim()
  return `${head}\n\n(Resumo) Slide editorial Instagram 4:5, texto legível, design limpo, sem marcas d'água.`
}

export interface IdeaSuggestion {
  titulo: string
  descricao: string
}

export interface CarouselScript {
  titulo: string
  slides: { numero: number; texto: string }[]
  legenda: string
  hashtags: string[]
}

export interface ReferenciaItem {
  tipo: 'url' | 'arquivo'
  valor: string
  nome: string
}

async function callGemini(prompt: string, useSearch = false): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  }
  if (useSearch) {
    body.tools = [{ google_search: {} }]
  }

  const response = await fetch(GEMINI_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${err}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  const blocked = data.promptFeedback && typeof data.promptFeedback === 'object'
    ? (data.promptFeedback as { blockReason?: string }).blockReason
    : undefined
  if (blocked) {
    throw new Error(`Gemini bloqueou o prompt (${blocked}). Reformule título ou referências.`)
  }

  const candidates = data.candidates as Array<{
    finishReason?: string
    content?: { parts?: Array<{ text?: string }> }
  }> | undefined
  const cand = candidates?.[0]
  if (!cand) {
    const hint = JSON.stringify(data.promptFeedback ?? data.error ?? {}).slice(0, 350)
    throw new Error(`Gemini não retornou candidatos. ${hint || 'Resposta inesperada.'}`)
  }

  const fr = cand.finishReason
  const frStr = fr != null ? String(fr) : ''
  const finishOk =
    !frStr ||
    frStr === 'STOP' ||
    frStr === 'MAX_TOKENS' ||
    frStr === '1' ||
    frStr === '2' ||
    /_STOP$/.test(frStr) ||
    /_MAX_TOKENS$/.test(frStr)
  if (!finishOk) {
    throw new Error(`Gemini não completou o texto (${frStr}). Tente sem URLs ou com prompt menor.`)
  }

  const text =
    cand.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text.trim()) {
    throw new Error('Gemini retornou texto vazio (possível bloqueio ou erro no modelo).')
  }
  return text
}

function extrairObjetoBalanceado(s: string, abre: '{' | '['): string | null {
  const start = s.indexOf(abre)
  if (start === -1) return null
  const fecha = abre === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === abre) depth++
    else if (c === fecha) {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

function extrairJSON<T>(text: string, arrayWrapper = false): T {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Resposta vazia do Gemini.')
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const bloques = fenceMatch ? [fenceMatch[1].trim(), trimmed] : [trimmed]

  const tryParse = (chunk: string): T | null => {
    try {
      return JSON.parse(chunk) as T
    } catch {
      return null
    }
  }

  for (const chunk of bloques) {
    if (arrayWrapper) {
      const whole = tryParse(chunk)
      if (whole !== null && Array.isArray(whole)) return whole

      const arrRaw = extrairObjetoBalanceado(chunk, '[')
      if (arrRaw) {
        const parsed = tryParse(arrRaw)
        if (parsed !== null) return parsed as T
      }
      const greedy = chunk.match(/\[[\s\S]*\]/)
      if (greedy) {
        const parsed = tryParse(greedy[0])
        if (parsed !== null) return parsed as T
      }
    } else {
      const whole = tryParse(chunk)
      if (whole !== null && typeof whole === 'object' && whole !== null && !Array.isArray(whole)) {
        return whole
      }

      const objRaw = extrairObjetoBalanceado(chunk, '{')
      if (objRaw) {
        const parsed = tryParse(objRaw)
        if (parsed !== null) return parsed as T
      }

      const greedy = chunk.match(/\{[\s\S]*\}/)
      if (greedy) {
        const parsed = tryParse(greedy[0])
        if (parsed !== null) return parsed as T
      }
    }
  }

  const snippet = trimmed.slice(0, 280)
  throw new Error(
    `Resposta inválida do Gemini: JSON não encontrado. Trecho: ${snippet}${trimmed.length > 280 ? '…' : ''}`
  )
}

export async function gerarRoteiro(params: {
  tema: string
  tomNome: string
  publico: string
  cta: string
  qtdSlides: number
  referencias: ReferenciaItem[]
}): Promise<CarouselScript> {
  const { tema, tomNome, publico, cta, qtdSlides, referencias } = params

  const urlRefs = referencias.filter((r) => r.tipo === 'url').map((r) => r.valor)
  const hasUrls = urlRefs.length > 0

  const refBlock = hasUrls
    ? `\n\nReferências de conteúdo (use como base para o roteiro):\n${urlRefs.map((u) => `- ${u}`).join('\n')}`
    : ''

  const prompt = `Você é um estrategista de conteúdo especialista em Instagram.
Crie um roteiro completo de carrossel com exatamente ${qtdSlides} slides sobre: "${tema}".
Tom de voz: ${tomNome || 'profissional e direto'}.
Público-alvo: ${publico}.
Call-to-action: ${cta}.${refBlock}

Regras:
- Slide 1: título/gancho forte que pare o scroll
- Slides intermediários: desenvolvimento do tema com informações concretas, baseadas nas referências quando fornecidas
- Último slide: CTA direto (use: "${cta}")
- Textos curtos (máx. 2 linhas por slide)
- Se há referências de URLs, pesquise e use o conteúdo dessas fontes

Responda APENAS com JSON válido no formato:
{
  "titulo": "título do post",
  "slides": [{"numero": 1, "texto": "..."}, ...],
  "legenda": "legenda completa para o post",
  "hashtags": ["hashtag1", "hashtag2"]
}`

  const text = await callGemini(prompt, hasUrls)
  return extrairJSON<CarouselScript>(text, false)
}

export async function gerarIdeias(
  categoriaNome: string,
  categoriaDescricao: string,
  referencias: string,
  quantidade = 5
): Promise<IdeaSuggestion[]> {
  const hasRefs = !!referencias?.trim()

  const prompt = `Você é um estrategista de conteúdo para redes sociais.
Com base no tema "${categoriaNome}" (${categoriaDescricao})${hasRefs ? ` e nestas referências: ${referencias}` : ''}, sugira ${quantidade} ideias de posts para Instagram no formato carrossel.
${hasRefs ? 'Baseie as ideias no conteúdo das referências fornecidas.' : ''}
Para cada ideia: título curto e impactante + descrição de 2 linhas explicando o ângulo.
Responda APENAS com JSON válido no formato: [{"titulo": "...", "descricao": "..."}]`

  const text = await callGemini(prompt, hasRefs)
  return extrairJSON<IdeaSuggestion[]>(text, true)
}

export interface NodeSlide {
  slide_number: number
  slide_type: 'cover' | 'body' | 'cta'
  tag_text?: string
  headline?: string
  subheadline?: string
  body_paragraph?: string
  cta_message?: string
}

export interface NodeCarouselScript {
  styles: SlideStyles
  slides: NodeSlide[]
}

interface ParsedSlidesOnlyJson {
  slides: NodeSlide[]
}

const DS_MARKDOWN_MAX_CHARS = 10_000

function truncarMarkdown(ds: string): string {
  const t = ds.trim()
  if (t.length <= DS_MARKDOWN_MAX_CHARS) return t
  return `${t.slice(0, DS_MARKDOWN_MAX_CHARS)}\n\n[… documento truncado …]`
}

/** Fase 1a: só copy editorial (tema + referências). Sem design system. */
export async function gerarConteudoSlides(params: {
  titulo: string
  descricao: string
  referencesUrls: string[]
  referencesText: string
  tomNome: string
  tomDescricao: string
  totalSlides: number
}): Promise<NodeSlide[]> {
  const { titulo, descricao, referencesUrls, referencesText, tomNome, tomDescricao, totalSlides } = params
  const hasUrls = referencesUrls.length > 0

  const refBlock = [
    referencesText ? `Contexto adicional:\n${referencesText}` : '',
    hasUrls ? `Links de referência (use como fonte do argumento):\n${referencesUrls.map((u) => `- ${u}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n')

  const prompt = `Você é estrategista de conteúdo para Instagram (somente TEXTO dos slides).

TEMA DO CARROSSEL: "${titulo}"
Descrição: ${descricao || 'não fornecida'}.
Tom de voz: ${tomNome}${tomDescricao ? ` — ${tomDescricao}` : ''}.
${refBlock ? `\n${refBlock}\n` : ''}

TAREFA: gere EXATAMENTE ${totalSlides} slides de CONTEÚDO editorial.
- O assunto dos textos deve vir do tema + descrição + referências (URLs/contexto). Não invente outro tema.
- Slide 1 "cover": tag (2–3 palavras), headline forte, subheadline curta.
- Slides 2 a ${totalSlides - 1} "body": headline + body_paragraph (2–3 linhas).
- Slide ${totalSlides} "cta": cta_message (convite a salvar/compartilhar/seguir).

PROIBIDO neste JSON: falar de design system, paleta, ferramentas de UI, mockups ou documentação visual.

Responda APENAS com JSON válido:
{
  "slides": [
    { "slide_number": 1, "slide_type": "cover", "tag_text": "...", "headline": "...", "subheadline": "..." },
    { "slide_number": 2, "slide_type": "body", "headline": "...", "body_paragraph": "..." },
    { "slide_number": ${totalSlides}, "slide_type": "cta", "cta_message": "..." }
  ]
}`

  const text = await callGemini(prompt, hasUrls)
  const parsed = extrairJSON<ParsedSlidesOnlyJson>(text, false)
  return normalizeNodeSlides(parsed.slides ?? [], totalSlides)
}

/** Fase 1b: extrai tokens visuais do markdown do DS (chamada separada). */
export async function extrairSlideStylesDoDesignSystem(designSystemMarkdown: string): Promise<Partial<SlideStyles>> {
  const md = truncarMarkdown(designSystemMarkdown)
  if (!md) return {}

  const prompt = `Você interpreta um guia de design system em Markdown e devolve APENAS tokens visuais para slides de carrossel Instagram.

Markdown do design system:
---
${md}
---

Extraia e mapeie para este JSON (use valores do guia; onde não houver info, use os defaults sugeridos abaixo).
NÃO inclua texto de slides, headlines nem copy. Apenas o objeto "styles".

Defaults sugeridos quando ausente no guia:
{"primaryColor":"#6D28D9","backgroundColor":"#FFFFFF","textColor":"#1A1A1A","ctaBackgroundColor":"#6D28D9","ctaTextColor":"#FFFFFF","tagColor":"#6D28D9","coverHeadlineFontSize":32,"coverSubheadlineFontSize":14,"bodyHeadlineFontSize":24,"bodyParagraphFontSize":16,"ctaFontSize":28,"coverTextAlign":"left","bodyTextAlign":"left","padding":24}

Responda APENAS com JSON no formato:
{"styles": { ...campos SlideStyles... }}`

  const text = await callGemini(prompt, false)
  const parsed = extrairJSON<{ styles?: Partial<SlideStyles> }>(text, false)
  return parsed.styles ?? {}
}

/** Brief curto só para Imagen — regras visuais, sem colar o markdown bruto. */
export async function compactarDesignSystemParaBriefVisual(designSystemMarkdown: string): Promise<string> {
  const md = truncarMarkdown(designSystemMarkdown)
  if (!md) return ''

  const prompt = `Resuma o Markdown abaixo em NO MÁXIMO 600 caracteres, em português, só como REGRAS VISUAIS ABSTRATAS para gerar imagens estáticas de carrossel (paleta, contraste, hierarquia tipográfica, margens, ritmo, estilo gráfico genérico).

PROIBIDO na sua resposta: copiar títulos do documento, palavras literais longas do guia, "design system documentation", menção a celular/mockup/tela/wireframe.

Markdown:
---
${md}
---`

  const text = (await callGemini(prompt, false)).trim()
  return text.length > 900 ? text.slice(0, 897) + '…' : text
}

function normalizeNodeSlides(raw: NodeSlide[], totalSlides: number): NodeSlide[] {
  if (totalSlides < 1) return []
  const list = Array.isArray(raw) ? raw.filter(Boolean) : []
  const byNum = new Map<number, NodeSlide>()
  for (const s of list) {
    const n = Number(s.slide_number)
    if (!Number.isFinite(n)) continue
    const clamped = Math.min(Math.max(Math.round(n), 1), totalSlides)
    byNum.set(clamped, { ...s, slide_number: clamped })
  }
  const sampleBody = [...byNum.values()].find((v) => v.slide_type === 'body')
  const out: NodeSlide[] = []
  for (let i = 1; i <= totalSlides; i++) {
    const existing = byNum.get(i)
    if (existing) {
      let slide_type = existing.slide_type
      if (i === 1) slide_type = 'cover'
      else if (i === totalSlides) slide_type = 'cta'
      else slide_type = 'body'
      out.push({ ...existing, slide_type })
      continue
    }
    if (i === 1) {
      out.push({
        slide_number: 1,
        slide_type: 'cover',
        tag_text: 'Destaque',
        headline: 'Carrossel',
        subheadline: '',
      })
    } else if (i === totalSlides) {
      out.push({
        slide_number: totalSlides,
        slide_type: 'cta',
        cta_message: 'Salve este post para revisitar depois.',
      })
    } else {
      out.push({
        slide_number: i,
        slide_type: 'body',
        headline: `Ponto ${i}`,
        body_paragraph: sampleBody?.body_paragraph ?? 'Detalhes na sequência.',
      })
    }
  }
  return out
}

export function carouselSlideToNodeSlide(s: CarouselSlide): NodeSlide {
  return {
    slide_number: s.slide_number,
    slide_type: s.slide_type,
    tag_text: s.tag_text ?? undefined,
    headline: s.headline ?? undefined,
    subheadline: s.subheadline ?? undefined,
    body_paragraph: s.body_paragraph ?? undefined,
    cta_message: s.cta_message ?? undefined,
  }
}

export async function gerarRoteirosNodes(params: {
  titulo: string
  descricao: string
  referencesUrls: string[]
  referencesText: string
  tomNome: string
  tomDescricao: string
  designSystemMarkdown: string
  totalSlides: number
}): Promise<NodeCarouselScript> {
  const { titulo, descricao, referencesUrls, referencesText, tomNome, tomDescricao, designSystemMarkdown, totalSlides } = params

  const [slides, partialStyles] = await Promise.all([
    gerarConteudoSlides({
      titulo,
      descricao,
      referencesUrls,
      referencesText,
      tomNome,
      tomDescricao,
      totalSlides,
    }),
    designSystemMarkdown.trim()
      ? extrairSlideStylesDoDesignSystem(designSystemMarkdown)
      : Promise.resolve({} as Partial<SlideStyles>),
  ])

  const mergedStyles: SlideStyles = { ...DEFAULT_SLIDE_STYLES, ...partialStyles }
  return {
    styles: mergedStyles,
    slides,
  }
}

export async function regenerarCampoSlide(params: {
  slideType: 'cover' | 'body' | 'cta'
  campo: string
  textoAtual: string
  tomNome: string
  instrucoes?: string
}): Promise<string> {
  const { slideType, campo, textoAtual, tomNome, instrucoes } = params
  const prompt = `Você é um especialista em conteúdo para Instagram.
Tom de voz: ${tomNome}.
Tipo de slide: ${slideType}.
Campo a regenerar: ${campo}.
Texto atual: "${textoAtual}".
${instrucoes ? `Instruções adicionais: ${instrucoes}` : ''}
Gere apenas o novo texto para o campo "${campo}". Responda SOMENTE com o texto, sem aspas, sem formatação extra.`

  return callGemini(prompt, false)
}

function extractImagenBase64(data: unknown): string | null {
  const walk = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object') return null
    const o = obj as Record<string, unknown>
    const b64 =
      typeof o.bytesBase64Encoded === 'string'
        ? o.bytesBase64Encoded
        : typeof o.bytes_base64_encoded === 'string'
          ? o.bytes_base64_encoded
          : null
    if (b64 && b64.length > 80) return b64
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          const found = walk(item)
          if (found) return found
        }
      } else if (v && typeof v === 'object') {
        const found = walk(v)
        if (found) return found
      }
    }
    return null
  }
  return walk(data)
}

async function predictImagenModel(
  modelId: string,
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
  signal: AbortSignal
): Promise<string> {
  const url = `${GEMINI_IMAGE_PREDICT}/${modelId}:predict?key=${encodeURIComponent(GEMINI_API_KEY)}`
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio },
    }),
  })

  const rawText = await response.text()
  let data: unknown
  try {
    data = JSON.parse(rawText) as unknown
  } catch {
    data = null
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'error' in data
        ? JSON.stringify((data as { error?: unknown }).error)
        : rawText.slice(0, 400)
    throw new Error(`Imagen (${modelId}) ${response.status}: ${detail}`)
  }

  if (data === null || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
    throw new Error(`Imagen (${modelId}): resposta vazia {} (filtro de segurança ou cota; tente prompt mais curto)`)
  }

  const preds =
    data && typeof data === 'object' && Array.isArray((data as { predictions?: unknown }).predictions)
      ? ((data as { predictions: unknown[] }).predictions)
      : null
  if (preds && preds.length === 0) {
    throw new Error(`Imagen (${modelId}): predictions vazio`)
  }

  const base64 = extractImagenBase64(data)
  if (!base64) throw new Error(`Imagen (${modelId}): resposta sem imagem em base64`)

  return `data:image/png;base64,${base64}`
}

/** Imagen não expõe 4:5 na API; 3:4 é o retrato mais próximo para feed. */
export async function generateSlideImage(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '3:4'
): Promise<string> {
  if (!GEMINI_API_KEY?.trim()) {
    throw new Error('Chave Gemini ausente: defina VITE_GEMINI_API_KEY')
  }

  const controller = new AbortController()
  const timeoutMs = 120_000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let lastErr: Error | null = null
  try {
    const promptVariants = [prompt]
    const short = simplifyImagenPrompt(prompt)
    if (short !== prompt) promptVariants.push(short)

    for (const modelId of IMAGEN_MODEL_IDS) {
      for (const p of promptVariants) {
        try {
          return await predictImagenModel(modelId, p, aspectRatio, controller.signal)
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
        }
      }
    }
    throw lastErr ?? new Error('Nenhum modelo Imagen respondeu')
  } finally {
    clearTimeout(timer)
  }
}

// Analisa imagens de referência do design system com visão do Gemini
// Retorna uma descrição textual do estilo visual para usar no prompt do Imagen
export async function analisarReferenciasVisuais(imageUrls: string[]): Promise<string> {
  if (!imageUrls.length) return ''

  const imageParts = await Promise.allSettled(
    imageUrls.slice(0, 4).map(async (url) => {
      const res = await fetch(url)
      const blob = await res.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      return { inlineData: { mimeType: blob.type || 'image/jpeg', data: base64 } }
    })
  )

  const validParts = imageParts
    .filter((r): r is PromiseFulfilledResult<{ inlineData: { mimeType: string; data: string } }> => r.status === 'fulfilled')
    .map((r) => r.value)

  if (!validParts.length) return ''

  const body = {
    contents: [{
      role: 'user',
      parts: [
        ...validParts,
        {
          text: `Estas imagens são REFERÊNCIA VISUAL apenas para novos layouts de carrossel Instagram (proporção 4:5).

NÃO descreva: smartphones, laptops, molduras de dispositivo, telas de app, wireframes, páginas de documentação, screenshots de sites ou UI de “design system”.
Descreva só estilo ABSTRATO reutilizável: paleta, contraste, hierarquia tipográfica (pesos/tamanhos relativos), margens, grid, densidade, geométricos decorativos genéricos, tratamento foto vs tipo vs ilustração genérica.

Responda em português, até ~160 palavras em bullets. Última linha: “Consistência entre slides: …”.`,
        },
      ],
    }],
  }

  const response = await fetch(GEMINI_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) return ''
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// Gera o slide COMPLETO como imagem — texto + design + visual integrados
export async function gerarSlideCompleto(params: {
  slide: NodeSlide
  styles: SlideStyles
  visualBrief?: string
  referenceDescription: string
}): Promise<string> {
  const { slide, styles: s, visualBrief = '', referenceDescription } = params

  const typeLabel = slide.slide_type === 'cover' ? 'Capa' : slide.slide_type === 'body' ? 'Conteúdo' : 'CTA'
  const isCTA = slide.slide_type === 'cta'
  const alignLabel = slide.slide_type === 'body' ? s.bodyTextAlign : s.coverTextAlign

  const contentLines: string[] = []
  if (slide.slide_type === 'cover') {
    if (slide.tag_text) contentLines.push(`Tag (pequeno, uppercase, cor ${s.tagColor}): "${slide.tag_text}"`)
    if (slide.headline) contentLines.push(`Headline principal (grande, bold, cor ${s.textColor}): "${slide.headline}"`)
    if (slide.subheadline) contentLines.push(`Subheadline (menor, cor ${s.textColor} com 70% opacidade): "${slide.subheadline}"`)
  } else if (slide.slide_type === 'body') {
    if (slide.headline) contentLines.push(`Título (bold, cor ${s.textColor}): "${slide.headline}"`)
    if (slide.body_paragraph) contentLines.push(`Parágrafo (regular, cor ${s.textColor}): "${slide.body_paragraph}"`)
  } else if (slide.slide_type === 'cta') {
    if (slide.cta_message) contentLines.push(`Mensagem CTA (grande, centralizada, cor ${s.ctaTextColor}): "${slide.cta_message}"`)
  }

  const layoutDesc = slide.slide_type === 'cover'
    ? 'Slide de capa: composição visual marcante, headline em destaque, hierarquia tipográfica clara'
    : slide.slide_type === 'body'
    ? 'Slide de conteúdo: fundo limpo, texto bem espaçado, elemento gráfico complementar sutil'
    : 'Slide CTA: fundo totalmente preenchido com cor de destaque, texto centralizado e impactante'

  const briefNote = visualBrief.trim()
    ? `\nDIRETRIZES VISUAIS RESUMIDAS (estilo apenas — não ilustrar como documento nem UI):\n${visualBrief}\n`
    : ''

  const refNote = referenceDescription.trim()
    ? `\nALINHAMENTO AO LOOK DE REFERÊNCIA (família visual dos slides; sem copiar logos nem fotos literais):\n${referenceDescription}\n`
    : ''

  const ctaColors = isCTA
    ? `- Fundo do slide: ${s.ctaBackgroundColor}\n- Cor do texto: ${s.ctaTextColor}`
    : `- Fundo do slide: ${s.backgroundColor}\n- Cor do texto: ${s.textColor}`

  const prompt = `Post estático para Instagram carrossel. UM ÚNICO quadro vertical ~4:5 (~1080x1350). Slide ${slide.slide_number}, tipo "${typeLabel}".

CONTEÚDO VISUAL: ilustre o TEMA pelos TEXTOS abaixo — não mostre documentação, guias internos nem interfaces de ferramenta.

CORES E TOKENS (obrigatório):
- Cor primária/destaque: ${s.primaryColor}
${ctaColors}
${briefNote}${refNote}
TEXTOS QUE DEVEM APARECER NA IMAGEM (exatamente):
${contentLines.join('\n') || 'Sem texto'}

LAYOUT: ${layoutDesc}
Alinhamento: ${alignLabel}
Padding: ${s.padding}px

PROIBIDO NA IMAGEM:
- Smartphone, tablet, laptop, moldura de dispositivo, mockup de tela, wireframe
- Página ou painel de “Design System”, documentação técnica, screenshots de sites como objeto principal
- Palavras como “Design System Documentation” ou títulos de guia que não sejam os textos do slide acima

REQUISITOS:
- Tipografia legível; hierarquia clara; arte editorial para feed
- Sem marcas d'água; sem logos de terceiros inventados
- Este slide deve combinar visualmente com os outros do mesmo carrossel`

  return generateSlideImage(prompt)
}
