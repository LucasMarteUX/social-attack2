import type { CarouselSlide, SlideStyles } from '../data/mock'
import { DEFAULT_SLIDE_STYLES } from '../data/mock'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

const GEMINI_TEXT_MODEL_QUALITY =
  (import.meta.env.VITE_GEMINI_TEXT_MODEL_QUALITY as string | undefined)?.trim() || 'gemini-2.5-pro'
const GEMINI_TEXT_MODEL_FAST =
  (import.meta.env.VITE_GEMINI_TEXT_MODEL_FAST as string | undefined)?.trim() || 'gemini-2.5-flash'

type GeminiTextTier = 'quality' | 'fast'

const GEMINI_TEXT_RETRY_MAX = Math.min(
  8,
  Math.max(1, Number((import.meta.env.VITE_GEMINI_TEXT_RETRIES as string | undefined) ?? '4') || 4),
)
const GEMINI_TEXT_RETRY_BASE_MS = Math.max(
  400,
  Number((import.meta.env.VITE_GEMINI_TEXT_RETRY_BASE_MS as string | undefined) ?? '1200') || 1200,
)

const GEMINI_IMAGE_HTTP_RETRY_MAX = Math.min(
  6,
  Math.max(1, Number((import.meta.env.VITE_GEMINI_IMAGE_RETRIES as string | undefined) ?? '3') || 3),
)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientGeminiHttpStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503
}

function geminiGenerateContentUrl(modelId: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`
}

function parseCommaModels(raw: string | undefined, fallback: readonly string[]): string[] {
  const list = raw
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return list?.length ? list : [...fallback]
}

/** Nano Banana Pro ≈ gemini-3-pro-image-preview; fallback flash-image. Lista via VITE_GEMINI_IMAGE_NATIVE_MODELS (CSV). */
const GEMINI_IMAGE_NATIVE_MODEL_IDS = parseCommaModels(
  import.meta.env.VITE_GEMINI_IMAGE_NATIVE_MODELS as string | undefined,
  ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'],
)

const GEMINI_IMAGE_PREDICT = 'https://generativelanguage.googleapis.com/v1beta/models'

/** Ordem: qualidade → velocidade. Evita imagen-3.x (indisponível em :predict no v1beta). */
const IMAGEN_MODEL_IDS = ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001'] as const

export type SlideImageAspectRatio = '1:1' | '3:4' | '4:3' | '4:5' | '9:16' | '16:9'

type ImagenPredictAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9'

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

interface PostGeminiPartsOptions {
  useSearch?: boolean
  tier?: GeminiTextTier
  model?: string
}

function parseGeminiTextResponse(data: Record<string, unknown>): string {
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

async function postGeminiParts(
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  options: boolean | PostGeminiPartsOptions = {},
): Promise<string> {
  const opts: PostGeminiPartsOptions =
    typeof options === 'boolean' ? { useSearch: options } : (options ?? {})
  const useSearch = !!opts.useSearch
  const explicit = opts.model?.trim()

  const modelChain: string[] = explicit
    ? [explicit]
    : opts.tier === 'fast'
      ? [GEMINI_TEXT_MODEL_FAST]
      : [GEMINI_TEXT_MODEL_QUALITY, GEMINI_TEXT_MODEL_FAST]

  const uniqueModels = [...new Set(modelChain)]

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
  }
  if (useSearch) {
    body.tools = [{ google_search: {} }]
  }

  const bodyJson = JSON.stringify(body)
  let lastErr: Error | null = null

  for (const modelId of uniqueModels) {
    for (let attempt = 0; attempt < GEMINI_TEXT_RETRY_MAX; attempt++) {
      try {
        const response = await fetch(geminiGenerateContentUrl(modelId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyJson,
        })

        const rawText = await response.text()

        if (!response.ok) {
          const retryable = isTransientGeminiHttpStatus(response.status)
          const canRetrySameModel = retryable && attempt < GEMINI_TEXT_RETRY_MAX - 1
          if (canRetrySameModel) {
            const delay =
              GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400)
            await sleep(delay)
            continue
          }
          lastErr = new Error(`Gemini API error ${response.status}: ${rawText.slice(0, 800)}`)
          if (retryable && uniqueModels.length > 1 && modelId !== uniqueModels[uniqueModels.length - 1]) {
            break
          }
          throw lastErr
        }

        let data: Record<string, unknown>
        try {
          data = JSON.parse(rawText) as Record<string, unknown>
        } catch {
          throw new Error(`Gemini resposta inválida (não JSON). Trecho: ${rawText.slice(0, 200)}`)
        }
        return parseGeminiTextResponse(data)
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Gemini API error')) throw e
        if (e instanceof Error && e.message.startsWith('Gemini bloqueou')) throw e
        if (e instanceof Error && e.message.startsWith('Gemini não retornou')) throw e
        if (e instanceof Error && e.message.startsWith('Gemini não completou')) throw e
        if (e instanceof Error && e.message.startsWith('Gemini retornou texto vazio')) throw e
        if (e instanceof Error && e.message.startsWith('Gemini resposta inválida')) throw e
        lastErr = e instanceof Error ? e : new Error(String(e))
        const canRetrySameModel = attempt < GEMINI_TEXT_RETRY_MAX - 1
        if (canRetrySameModel) {
          const delay =
            GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400)
          await sleep(delay)
          continue
        }
        break
      }
    }
  }

  throw lastErr ?? new Error('Gemini: falha após tentativas com todos os modelos.')
}

async function callGemini(
  prompt: string,
  useSearch = false,
  tier: GeminiTextTier = 'quality',
): Promise<string> {
  return postGeminiParts([{ text: prompt }], { useSearch, tier })
}

async function fetchImageUrlsAsInlineParts(
  urls: string[],
  max = 4
): Promise<Array<{ inlineData: { mimeType: string; data: string } }>> {
  const settled = await Promise.allSettled(
    urls.slice(0, max).map(async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
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
  return settled
    .filter((r): r is PromiseFulfilledResult<{ inlineData: { mimeType: string; data: string } }> => r.status === 'fulfilled')
    .map((r) => r.value)
}

async function fetchUrlAsGeminiInlinePart(
  url: string,
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const res = await fetch(trimmed)
    if (!res.ok) return null
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
  } catch {
    return null
  }
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

function sanitizarCamposNodeSlide(s: NodeSlide): NodeSlide {
  const limpar = (t: string | undefined): string | undefined => {
    if (!t?.trim()) return t
    let out = t
      .replace(/\bCTA\s*\d+\b/gi, '')
      .replace(/\bslide\s*\d+\s*$/i, '')
      .replace(/\(\s*placeholder\s*\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return out.length ? out : undefined
  }
  return {
    ...s,
    tag_text: limpar(s.tag_text),
    headline: limpar(s.headline),
    subheadline: limpar(s.subheadline),
    body_paragraph: limpar(s.body_paragraph),
    cta_message: limpar(s.cta_message),
  }
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

Precisão factual (obrigatório):
- Não invente preços em moeda, percentagens, datas ou números específicos que não apareçam explicitamente no tema, na descrição ou nas referências. Se o dado não estiver nas fontes, generalize sem número ou diga que é estimativa/indeterminado.
- Português claro com frases completas; não truncar ideias no meio.
- Proibido no texto: rótulos como "CTA 3", "Slide 5", "placeholder", parênteses meta ou texto que soe como instrução interna.

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
  return normalizeNodeSlides(parsed.slides ?? [], totalSlides).map(sanitizarCamposNodeSlide)
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

  const text = await callGemini(prompt, false, 'fast')
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

  const text = (await callGemini(prompt, false, 'fast')).trim()
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

/** Contexto editorial do carrossel para montar prompts de imagem por slide */
export interface CarouselImagePromptContext {
  titulo: string
  descricao: string
  referencesUrls: string[]
  referencesText: string
  tomNome: string
  tomDescricao: string
}

function textoSlideParaResumo(s: NodeSlide): string {
  const parts: string[] = []
  if (s.tag_text) parts.push(`tag: ${s.tag_text}`)
  if (s.headline) parts.push(`headline: ${s.headline}`)
  if (s.subheadline) parts.push(`sub: ${s.subheadline}`)
  if (s.body_paragraph) parts.push(`corpo: ${s.body_paragraph}`)
  if (s.cta_message) parts.push(`cta: ${s.cta_message}`)
  return parts.join(' · ') || '(sem texto)'
}

/** Gera o trecho criativo (Gemini texto ou visão) que orienta o Imagen para UM slide, com arco narrativo. */
export async function montarPromptImagemSlide(params: {
  carousel: CarouselImagePromptContext
  todosSlides: NodeSlide[]
  slideAtual: NodeSlide
  totalSlides: number
  styles: SlideStyles
  visualBrief?: string
  referenceDescription: string
  /** URLs das imagens de referência do design system — quando há, o Gemini vê os pixels e descreve layout fiel ao DS */
  referenceImageUrls?: string[]
}): Promise<string> {
  const {
    carousel,
    todosSlides,
    slideAtual,
    totalSlides,
    styles: st,
    visualBrief = '',
    referenceDescription,
    referenceImageUrls = [],
  } = params

  const refUrlsBlock =
    carousel.referencesUrls.length > 0
      ? `Links de referência (matéria/fonte):\n${carousel.referencesUrls.map((u) => `- ${u}`).join('\n')}`
      : ''
  const refTextBlock = carousel.referencesText.trim()
    ? `Contexto/texto colado pelo usuário:\n${carousel.referencesText}`
    : ''

  const sequencia = [...todosSlides]
    .sort((a, b) => a.slide_number - b.slide_number)
    .map((s) => `Slide ${s.slide_number}/${totalSlides} (${s.slide_type}): ${textoSlideParaResumo(s)}`)
    .join('\n')

  const papel =
    slideAtual.slide_type === 'cover'
      ? 'Capa: gancho visual forte; introduzir o tema do carrossel com impacto editorial.'
      : slideAtual.slide_type === 'cta'
      ? 'Fechamento (CTA): reforço visual para conversão (salvar/compartilhar/seguir); coerente com o tema.'
      : 'Meio: desenvolver um argumento da sequência; não repetir a capa; avançar a narrativa.'

  const vizBrief = visualBrief.trim()
    ? `\nResumo textual do guia de marca (Markdown resumido):\n${visualBrief}\n`
    : ''
  const refViz = referenceDescription.trim()
    ? `\nAnálise estruturada das imagens de referência do DS (tipografia, zonas, hierarquia — siga à risca):\n${referenceDescription}\n`
    : ''

  const tokensBlock = `Tokens obrigatórios no slide final: primária ${st.primaryColor}; fundo ${slideAtual.slide_type === 'cta' ? st.ctaBackgroundColor : st.backgroundColor}; texto principal ${slideAtual.slide_type === 'cta' ? st.ctaTextColor : st.textColor}; tag ${st.tagColor}; padding ~${st.padding}px; alinhamento título ${slideAtual.slide_type === 'body' ? st.bodyTextAlign : st.coverTextAlign}.`

  const imgParts = referenceImageUrls.length
    ? await fetchImageUrlsAsInlineParts(referenceImageUrls, 4)
    : []

  if (imgParts.length > 0) {
    const visionPrompt = `Você vê as imagens anexadas: são o padrão visual oficial (design system) de slides de carrossel Instagram 4:5.

TAREFA: escreva UM bloco de instruções em português (máx. 1300 caracteres) para um gerador de imagens criar UM slide NOVO que seja visualmente INDISTINGUÍVEL em estrutura desse sistema: mesmas zonas (topo/hero/rodapé), mesmo pareamento tipográfico (sans + serif itálico, etc.), mesma hierarquia de tamanhos, mesmas margens e ritmo — mas com o CONTEÚDO DE TEXTO abaixo (substitua qualquer placeholder das refs pelos textos reais).

TEMA DO CARROSSEL: "${carousel.titulo}"
${refUrlsBlock ? `${refUrlsBlock}\n` : ''}${refTextBlock ? `${refTextBlock}\n` : ''}

SEQUÊNCIA (contexto): 
${sequencia}

SLIDE ATUAL (${slideAtual.slide_number}/${totalSlides}, tipo ${slideAtual.slide_type}): ${textoSlideParaResumo(slideAtual)}
PAPEL: ${papel}

${tokensBlock}
${vizBrief}${refViz}

O slide gerado deve parecer o “próximo slide” do mesmo template das imagens anexas. Mesmas zonas de layout e hierarquia dos outros slides do carrossel; só muda o motivo visual/foto secundária. PROIBIDO: moldura de celular, mockup de app, UI de ferramenta, poster de “guia” ou documentação como tema.

Responda só com o bloco de instruções, sem markdown nem título.`

    try {
      const text = (await postGeminiParts([...imgParts, { text: visionPrompt }], { tier: 'quality' })).trim()
      return text.length > 1350 ? text.slice(0, 1347) + '…' : text
    } catch {
      /* cai no fluxo texto */
    }
  }

  const prompt = `Você escreve UM único parágrafo em português (máx. 900 caracteres): direção criativa para gerar uma imagem ESTÁTICA de slide de carrossel Instagram (~4:5), já incluindo como organizar o espaço para os textos indicados.

TEMA DO CARROSSEL: "${carousel.titulo}"
Descrição: ${carousel.descricao || 'não informada'}.
Tom de voz: ${carousel.tomNome}${carousel.tomDescricao ? ` — ${carousel.tomDescricao}` : ''}.
${refUrlsBlock ? `${refUrlsBlock}\n` : ''}${refTextBlock ? `${refTextBlock}\n` : ''}

SEQUÊNCIA COMPLETA DO CARROSSEL (respeite início/meio/fim):
${sequencia}

SLIDE A ILUSTRAR AGORA: número ${slideAtual.slide_number} de ${totalSlides}, tipo "${slideAtual.slide_type}".
Textos deste slide (devem aparecer na arte): ${textoSlideParaResumo(slideAtual)}

PAPEL NA HISTÓRIA: ${papel}

${tokensBlock}
${vizBrief}${refViz}

O layout deve obedecer à hierarquia e zonas descritas em “Análise estruturada” acima (se houver). Indistinguível em estrutura dos demais slides do mesmo carrossel (mesmo grid/margens); varie só imagem de apoio. PROIBIDO: smartphone/laptop/mockup; página de documentação como tema; citar frases literais de moodboards (“SUMMARY”, “GUIDELINES”).

Responda só com o parágrafo criativo, sem título nem markdown.`

  const text = (await callGemini(prompt, carousel.referencesUrls.length > 0)).trim()
  return text.length > 950 ? text.slice(0, 947) + '…' : text
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

function extractGeminiNativeInlineImage(data: unknown): { mimeType: string; data: string } | null {
  const candidates = (data as { candidates?: unknown[] })?.candidates
  const first = candidates?.[0]
  const parts =
    first && typeof first === 'object'
      ? (first as { content?: { parts?: unknown[] } }).content?.parts
      : undefined
  if (!Array.isArray(parts)) return null
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue
    const inline = (p as { inlineData?: { mimeType?: string; data?: string } }).inlineData
    const mime = inline?.mimeType ?? ''
    const d = inline?.data
    if (typeof d === 'string' && d.length > 80 && /^image\//i.test(mime)) {
      return { mimeType: mime || 'image/png', data: d }
    }
  }
  return null
}

function mapAspectForImagen(ar: SlideImageAspectRatio): ImagenPredictAspectRatio {
  if (ar === '4:5') return '3:4'
  return ar
}

async function tryGeminiNativeImage(
  prompt: string,
  aspectRatio: SlideImageAspectRatio,
  signal: AbortSignal,
  referenceInlineParts: Array<{ inlineData: { mimeType: string; data: string } }> = [],
): Promise<string | null> {
  const userParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [...referenceInlineParts, { text: prompt }]

  const bodyJson = JSON.stringify({
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio },
    },
  })

  for (const modelId of GEMINI_IMAGE_NATIVE_MODEL_IDS) {
    for (let attempt = 0; attempt < GEMINI_IMAGE_HTTP_RETRY_MAX; attempt++) {
      try {
        const response = await fetch(geminiGenerateContentUrl(modelId), {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: bodyJson,
        })
        const rawText = await response.text()

        if (!response.ok) {
          if (isTransientGeminiHttpStatus(response.status) && attempt < GEMINI_IMAGE_HTTP_RETRY_MAX - 1) {
            await sleep(
              GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400),
            )
            continue
          }
          break
        }

        let data: unknown
        try {
          data = JSON.parse(rawText) as unknown
        } catch {
          if (attempt < GEMINI_IMAGE_HTTP_RETRY_MAX - 1) {
            await sleep(GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt)
            continue
          }
          break
        }

        const img = extractGeminiNativeInlineImage(data)
        if (img) return `data:${img.mimeType};base64,${img.data}`
        break
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return null
        if (attempt < GEMINI_IMAGE_HTTP_RETRY_MAX - 1) {
          await sleep(GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400))
          continue
        }
        break
      }
    }
  }
  return null
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
  aspectRatio: ImagenPredictAspectRatio,
  signal: AbortSignal
): Promise<string> {
  const url = `${GEMINI_IMAGE_PREDICT}/${modelId}:predict?key=${encodeURIComponent(GEMINI_API_KEY)}`
  const bodyJson = JSON.stringify({
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio },
  })

  let lastErr: Error | null = null

  for (let attempt = 0; attempt < GEMINI_IMAGE_HTTP_RETRY_MAX; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: bodyJson,
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
      lastErr = new Error(`Imagen (${modelId}) ${response.status}: ${detail}`)
      if (isTransientGeminiHttpStatus(response.status) && attempt < GEMINI_IMAGE_HTTP_RETRY_MAX - 1) {
        await sleep(
          GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400),
        )
        continue
      }
      throw lastErr
    }

    if (data === null || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
      lastErr = new Error(
        `Imagen (${modelId}): resposta vazia {} (filtro de segurança ou cota; tente prompt mais curto)`,
      )
      if (attempt < GEMINI_IMAGE_HTTP_RETRY_MAX - 1) {
        await sleep(GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt)
        continue
      }
      throw lastErr
    }

    const preds =
      data && typeof data === 'object' && Array.isArray((data as { predictions?: unknown }).predictions)
        ? ((data as { predictions: unknown[] }).predictions)
        : null
    if (preds && preds.length === 0) {
      lastErr = new Error(`Imagen (${modelId}): predictions vazio`)
      if (attempt < GEMINI_IMAGE_HTTP_RETRY_MAX - 1) {
        await sleep(GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt)
        continue
      }
      throw lastErr
    }

    const base64 = extractImagenBase64(data)
    if (!base64) {
      lastErr = new Error(`Imagen (${modelId}): resposta sem imagem em base64`)
      if (attempt < GEMINI_IMAGE_HTTP_RETRY_MAX - 1) {
        await sleep(GEMINI_TEXT_RETRY_BASE_MS * 2 ** attempt)
        continue
      }
      throw lastErr
    }

    return `data:image/png;base64,${base64}`
  }

  throw lastErr ?? new Error(`Imagen (${modelId}): falha após tentativas`)
}

export type GeminiImageInlinePart = { inlineData: { mimeType: string; data: string } }

export interface GenerateSlideImageOptions {
  aspectRatio?: SlideImageAspectRatio
  /** Enviadas antes do texto no `generateContent` nativo (logo, piloto, mood). Imagen só recebe texto — usa prefixo automático. */
  referenceInlineParts?: GeminiImageInlinePart[]
}

/** Tenta imagem nativa Gemini (4:5 etc.) com modelos configurados; fallback Imagen `:predict` (4:5 → 3:4). */
export async function generateSlideImage(
  prompt: string,
  options: GenerateSlideImageOptions = {},
): Promise<string> {
  if (!GEMINI_API_KEY?.trim()) {
    throw new Error('Chave Gemini ausente: defina VITE_GEMINI_API_KEY')
  }

  const aspectRatio = options.aspectRatio ?? '4:5'
  const referenceInlineParts = options.referenceInlineParts ?? []

  const controller = new AbortController()
  const timeoutMs = 120_000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let lastErr: Error | null = null
  try {
    const native = await tryGeminiNativeImage(
      prompt,
      aspectRatio,
      controller.signal,
      referenceInlineParts,
    )
    if (native) return native

    const imagenVisualHint =
      referenceInlineParts.length > 0
        ? 'O utilizador anexou imagem(ns) de referência (logo/piloto/mood). Este modelo só aceita texto: incorporar estilo, cores e ritmo visual descritos no prompt principal na composição do fundo e da arte.\n\n'
        : ''

    const promptVariants = [prompt]
    const short = simplifyImagenPrompt(prompt)
    if (short !== prompt) promptVariants.push(short)

    const imagenAspect = mapAspectForImagen(aspectRatio)

    for (const modelId of IMAGEN_MODEL_IDS) {
      for (const p of promptVariants) {
        try {
          const pFinal = imagenVisualHint ? `${imagenVisualHint}${p}` : p
          return await predictImagenModel(modelId, pFinal, imagenAspect, controller.signal)
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
        }
      }
    }
    throw lastErr ?? new Error('Nenhum modelo de imagem respondeu')
  } finally {
    clearTimeout(timer)
  }
}

// Analisa imagens de referência do design system com visão do Gemini
// Retorna descrição estruturada (tipografia, zonas, hierarquia) para o Imagen
export async function analisarReferenciasVisuais(imageUrls: string[]): Promise<string> {
  if (!imageUrls.length) return ''

  const validParts = await fetchImageUrlsAsInlineParts(imageUrls, 4)
  if (!validParts.length) return ''

  const instruction = `Estas imagens são o DESIGN SYSTEM visual de referência para slides de carrossel Instagram (~4:5). O gerador de imagens deve REPLICAR a mesma lógica de layout e tipografia (não copiar texto literal “Lorem”, nem marca de terceiros).

Responda em português com estas seções (use os títulos exatos):

TIPOGRAFIA:
- Pareamento de fontes (ex.: sans-serif bold para título + serif itálico para destaque; tamanhos relativos entre tag, headline, corpo)
- Uso de caps, tracking, pesos

ZONAS_DE_LAYOUT:
- Onde ficam marca/contador (se houver), hero/imagem, bloco de título, corpo, rodapé/seta
- Proporções aproximadas (ex.: imagem ocupa terço inferior; texto no terço médio)

HIERARQUIA_VISUAL:
- Ordem de leitura e contraste entre níveis

PALETA:
- Fundo, texto primário, secundário, acentos (hex se visíveis)

TRATAMENTO_IMAGEM:
- Estilo fotográfico ou ilustração de fundo (ex.: monocromático dramático, 3D abstrato, etc.)

CONSISTENCIA_ENTRE_SLIDES:
- Uma linha: o que deve repetir em todos os slides deste carrossel

NÃO inclua: descrição de smartphone/mockup como objeto; frases literais dos prints que não sejam rótulos de estrutura; “é um PDF”.

Máximo ~320 palavras.`

  try {
    return (await postGeminiParts([...validParts, { text: instruction }], { tier: 'quality' })).trim()
  } catch {
    return ''
  }
}

// Gera o slide COMPLETO como imagem — texto + design + visual integrados
export async function gerarSlideCompleto(params: {
  slide: NodeSlide
  styles: SlideStyles
  visualBrief?: string
  referenceDescription: string
  /** Direção criativa por slide (Gemini); reforça matéria + arco narrativo */
  narrativaVisual?: string
  /** Piloto visual do utilizador (logo, marca, referência de fundo); multimodal no Gemini nativo */
  referenceInlineParts?: GeminiImageInlinePart[]
}): Promise<string> {
  const {
    slide,
    styles: s,
    visualBrief = '',
    referenceDescription,
    narrativaVisual = '',
    referenceInlineParts = [],
  } = params

  const userPixelsNote =
    referenceInlineParts.length > 0
      ? `IMAGENS_ANEXADAS_PELO_UTILIZADOR (${referenceInlineParts.length}): enviadas como pixels antes deste texto — usar como piloto para marca/logo/textura/mood do FUNDO e da arte gráfica. Os TEXTOS OBRIGATÓRIOS abaixo mantêm-se literais na arte.\n\n`
      : ''

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
    ? 'Capa: mesmo template das referências — zonas e hierarquia iguais aos demais slides; destaque para headline/tag sem mudar o grid'
    : slide.slide_type === 'body'
    ? 'Corpo: repetir o mesmo arranjo de zonas dos outros slides “corpo”; apenas imagem/foto de apoio muda'
    : `CTA: mesmo grid das referências com fundo ${s.ctaBackgroundColor}; mensagem centralizada — sem novo estilo gráfico`

  const consistenciaCarrossel = `TEMPLATE ÚNICO (obrigatório):
- Margens ${s.padding}px e hierarquia tipográfica RELATIVA iguais em todos os slides; parecer exportado do mesmo arquivo de layout.
- Slides de corpo compartilham a mesma estrutura entre si; não alternar entre layout totalmente diferente (ex.: só texto vs split pesado vs mockup 3D) salvo se as REFERÊNCIAS VISUAIS mostrarem essa variação explicitamente.
- CTA usa apenas os tokens de cor de CTA; não introduzir gradientes, neon ou elementos que não existam no design system descrito.\n`

  const briefNote = visualBrief.trim()
    ? `\nDIRETRIZES VISUAIS RESUMIDAS (estilo apenas — não ilustrar como documento nem UI):\n${visualBrief}\n`
    : ''

  const refNote = referenceDescription.trim()
    ? `\nALINHAMENTO AO LOOK DE REFERÊNCIA (replicar estrutura e tipografia do design system — sem copiar logos nem fotos literais):\n${referenceDescription}\n`
    : ''

  const ctaColors = isCTA
    ? `- Fundo do slide: ${s.ctaBackgroundColor}\n- Cor do texto: ${s.ctaTextColor}`
    : `- Fundo do slide: ${s.backgroundColor}\n- Cor do texto: ${s.textColor}`

  const narrativaNote = narrativaVisual.trim()
    ? `\nDIREÇÃO EDITORIAL (composição e metáfora visual alinhadas ao tema — os textos obrigatórios são só os listados abaixo):\n${narrativaVisual.trim()}\n`
    : ''

  const dsFidelity = referenceDescription.trim()
    ? `\nFIDELIDADE_AO_DESIGN_SYSTEM: Siga as zonas de layout (ZONAS_DE_LAYOUT), pareamento tipográfico (TIPOGRAFIA) e hierarquia descritos na referência acima. O resultado deve parecer o mesmo “template” das imagens de referência da marca, apenas com o conteúdo textual deste slide.\n`
    : ''

  const prompt = `Post estático para Instagram carrossel. UM ÚNICO quadro vertical ~4:5 (~1080x1350). Slide ${slide.slide_number}, tipo "${typeLabel}".

${userPixelsNote}CONTEÚDO VISUAL: ilustre o TEMA pelos TEXTOS abaixo — não mostre documentação, guias internos nem interfaces de ferramenta.
${narrativaNote}${dsFidelity}
CORES E TOKENS (obrigatório):
- Cor primária/destaque: ${s.primaryColor}
${ctaColors}
${briefNote}${refNote}
TEXTOS QUE DEVEM APARECER NA IMAGEM (exatamente):
${contentLines.join('\n') || 'Sem texto'}

${consistenciaCarrossel}
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

  return generateSlideImage(prompt, {
    referenceInlineParts: referenceInlineParts.length ? referenceInlineParts : undefined,
  })
}

/** Nova arte do mesmo slide: só muda fundo/camada visual; tipografia, cores de texto e diagramação idênticas à referência. */
export async function gerarVariacaoFundoSlide(params: {
  slide: NodeSlide
  styles: SlideStyles
  visualBrief?: string
  referenceDescription: string
  narrativaVisual?: string
  referenceInlineParts?: GeminiImageInlinePart[]
  /** Arte atual do slide (URL pública) — anexada como referência de composição a preservar */
  baseSlideImageUrl?: string | null
}): Promise<string> {
  const {
    slide,
    styles: s,
    visualBrief = '',
    referenceDescription,
    narrativaVisual = '',
    referenceInlineParts = [],
    baseSlideImageUrl = null,
  } = params

  const MAX_INLINE = 4
  const mergedParts: GeminiImageInlinePart[] = []
  const basePart = baseSlideImageUrl ? await fetchUrlAsGeminiInlinePart(baseSlideImageUrl) : null
  if (basePart) mergedParts.push(basePart)
  for (const p of referenceInlineParts) {
    if (mergedParts.length >= MAX_INLINE) break
    mergedParts.push(p)
  }

  const imgRoles =
    basePart && mergedParts.length > 1
      ? `ORDEM DAS IMAGENS ANEXADAS ANTES DESTE TEXTO:
1) COMPOSIÇÃO ATUAL DO SLIDE — copie a mesma diagramação de texto (fontes aparentes, pesos, cores dos caracteres, alinhamentos, tamanhos relativos, margens e posições dos blocos). Não redesenhe tipografia.
2) Em diante — referências do utilizador para o NOVO fundo (logo, mood, textura, paleta). Incorporar só na camada atrás do texto.\n\n`
      : basePart
        ? `HÁ UMA IMAGEM ANEXADA: é o slide atual. Preserve o texto e o layout tipográfico ao pixel; altere APENAS fotografia/ilustração/gradiente/textura por detrás.\n\n`
        : mergedParts.length > 0
          ? `Imagens anexadas: referências para o novo fundo e mood. Mantenha rigorosamente os tokens de tipografia e posições descritos abaixo (sem inventar novo grid).\n\n`
          : ''

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
    ? 'Capa: mesmo template — só nova fotografia/arte de fundo'
    : slide.slide_type === 'body'
    ? 'Corpo: mesmas zonas de texto — só nova imagem de apoio atrás'
    : `CTA: mesmo grid e tipografia — pode mudar só wash/fundo decorativo atrás de ${s.ctaBackgroundColor}`

  const briefNote = visualBrief.trim()
    ? `\nDIRETRIZES VISUAIS (herdadas — não mudar hierarquia tipográfica):\n${visualBrief}\n`
    : ''

  const refNote = referenceDescription.trim()
    ? `\nDESIGN SYSTEM (estrutura — não reinterpretar como slide diferente):\n${referenceDescription}\n`
    : ''

  const ctaColors = isCTA
    ? `- Fundo do slide: ${s.ctaBackgroundColor}\n- Cor do texto: ${s.ctaTextColor}`
    : `- Fundo do slide: ${s.backgroundColor}\n- Cor do texto: ${s.textColor}`

  const narrativaNote = narrativaVisual.trim()
    ? `\nNOVO FUNDO / DIREÇÃO (aplicar só na camada visual atrás do texto):\n${narrativaVisual.trim()}\n`
    : ''

  const prompt = `VARIAÇÃO DE FUNDO DO MESMO SLIDE (Instagram carrossel ~4:5). Slide ${slide.slide_number}, tipo "${typeLabel}".

${imgRoles}REGRAS ABSOLUTAS:
- Saída = nova VARIAÇÃO do MESMO post: os TEXTOS abaixo devem aparecer iguais em posição, hierarquia, cor de texto e peso — como na composição de referência.
- Altere APENAS fundo: foto, ilustração de fundo, textura, gradiente ou elementos decorativos POR TRÁS do texto.
- PROIBIDO: mudar fonte, tamanho de headline, cor do texto (exceto se já definida nos tokens), alinhamento, margens do bloco de texto, ou inventar novo layout de slide.
- PROIBIDO: smartphone mockup, UI, documentação como tema.

${narrativaNote}
CORES E TOKENS (texto — obrigatório respeitar):
- Cor primária/destaque: ${s.primaryColor}
${ctaColors}
${briefNote}${refNote}

TEXTOS QUE DEVEM APARECER NA IMAGEM (inalteráveis em estilo e posição relativa):
${contentLines.join('\n') || 'Sem texto'}

LAYOUT: ${layoutDesc}
Alinhamento texto: ${alignLabel}
Padding: ${s.padding}px

Este slide deve parecer o mesmo ficheiro de design com outra fotografia de fundo — não um post novo.`

  return generateSlideImage(prompt, {
    referenceInlineParts: mergedParts.length ? mergedParts : undefined,
  })
}
