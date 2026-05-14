import type { CarouselSlide, SlideStyles } from '../data/mock'
import { DEFAULT_SLIDE_STYLES } from '../data/mock'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

// gemini-2.5-flash: modelo estável para geração de texto (substitui gemini-2.0-flash)
const GEMINI_TEXT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

// imagen-4.0-generate-001: modelo atual para geração de imagens (substitui imagen-3.0-generate-002)
const GEMINI_IMAGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`

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

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function extrairJSON<T>(text: string, arrayWrapper = false): T {
  // Gemini 2.5 envolve JSON em ```json ... ``` — remover antes de parsear
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const source = fenceMatch ? fenceMatch[1] : text

  const pattern = arrayWrapper ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const match = source.match(pattern)
  if (!match) throw new Error('Resposta inválida do Gemini: JSON não encontrado')

  try {
    return JSON.parse(match[0]) as T
  } catch {
    throw new Error('Resposta inválida do Gemini: JSON malformado')
  }
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

interface ParsedNodeCarouselJson {
  styles?: Partial<SlideStyles>
  slides: NodeSlide[]
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
  const hasUrls = referencesUrls.length > 0

  const refBlock = [
    referencesText ? `Contexto adicional:\n${referencesText}` : '',
    hasUrls ? `Links de referência:\n${referencesUrls.map((u) => `- ${u}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n')

  const dsBlock = designSystemMarkdown.trim()
    ? `\nDesign System:\n${designSystemMarkdown}\n`
    : ''

  const prompt = `Você é um especialista em criação de conteúdo e design para Instagram.

TAREFA: Gere um carrossel com ${totalSlides} slides sobre "${titulo}" E extraia os estilos visuais do design system.

Tom de voz: ${tomNome}${tomDescricao ? ` — ${tomDescricao}` : ''}.
Descrição: ${descricao || 'não fornecida'}.
${dsBlock}${refBlock ? `\n${refBlock}\n` : ''}
SLIDES:
- Slide 1: tipo "cover" — tag (2-3 palavras), headline (título impactante), subheadline (frase curta)
- Slides 2 a ${totalSlides - 1}: tipo "body" — headline + body_paragraph (2-3 linhas)
- Slide ${totalSlides}: tipo "cta" — cta_message (chamada para salvar/seguir)

Regras:
- Textos diretos e sem prolixidade
- Se há URLs de referência, pesquise e use o conteúdo dessas fontes
- Responda APENAS com JSON válido, sem texto extra

Formato obrigatório (preencha "styles" com os valores reais do design system acima; use os defaults indicados se não houver design system):
{
  "styles": {
    "primaryColor": "#6D28D9",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1A1A1A",
    "ctaBackgroundColor": "#6D28D9",
    "ctaTextColor": "#FFFFFF",
    "tagColor": "#6D28D9",
    "coverHeadlineFontSize": 32,
    "coverSubheadlineFontSize": 14,
    "bodyHeadlineFontSize": 24,
    "bodyParagraphFontSize": 16,
    "ctaFontSize": 28,
    "coverTextAlign": "left",
    "bodyTextAlign": "left",
    "padding": 24
  },
  "slides": [
    { "slide_number": 1, "slide_type": "cover", "tag_text": "...", "headline": "...", "subheadline": "..." },
    { "slide_number": 2, "slide_type": "body", "headline": "...", "body_paragraph": "..." },
    { "slide_number": ${totalSlides}, "slide_type": "cta", "cta_message": "..." }
  ]
}`

  const text = await callGemini(prompt, hasUrls)
  const parsed = extrairJSON<ParsedNodeCarouselJson>(text, false)
  const mergedStyles: SlideStyles = { ...DEFAULT_SLIDE_STYLES, ...(parsed.styles ?? {}) }
  return {
    styles: mergedStyles,
    slides: normalizeNodeSlides(parsed.slides ?? [], totalSlides),
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

/** Imagen não expõe 4:5 na API; 3:4 é o retrato mais próximo para feed. */
export async function generateSlideImage(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '3:4'
): Promise<string> {
  const response = await fetch(GEMINI_IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio },
    }),
  })

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = await response.json()
  const base64 = data.predictions?.[0]?.bytesBase64Encoded
  if (!base64) throw new Error('Nenhuma imagem retornada pelo Gemini')

  return `data:image/png;base64,${base64}`
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
          text: `Analise estas imagens só como referência de ESTILO para novos layouts de carrossel Instagram (4:5). Não copie logos, marcas, fotos reconhecíveis, texto literal nem layout pixel a pixel.

Extraia um PADRÃO REPETÍVEL que deva valer para TODOS os slides do mesmo carrossel:
- Paleta (fundo, texto, acentos) e contraste
- Hierarquia tipográfica (pesos, tamanhos relativos, espaçamento entre linhas)
- Ritmo de quadro: margens seguras, grid implícito, alinhamentos predominantes
- Tratamento visual: foto cheia vs tipografia dominante vs ilustração; uso de sombras, cantos, linhas ou formas decorativas GENÉRICAS
- Como imaginar capa vs slide de conteúdo vs CTA mantendo a mesma “família” visual

Responda em português, até ~180 palavras, em bullets curtos quando ajudar a clareza. Última linha: “Regras para manter consistência entre slides: …”.`,
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
// A imagem gerada é o próprio post, não apenas uma imagem de fundo
export async function gerarSlideCompleto(params: {
  slide: NodeSlide
  styles: SlideStyles
  designSystemMarkdown: string
  referenceDescription: string
}): Promise<string> {
  const { slide, styles: s, designSystemMarkdown, referenceDescription } = params

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

  const dsNote = designSystemMarkdown.trim()
    ? `\nDOCUMENTAÇÃO DO DESIGN SYSTEM (siga rigorosamente):\n${designSystemMarkdown}\n`
    : ''

  const refNote = referenceDescription.trim()
    ? `\nPADRÃO DAS REFERÊNCIAS VISUAIS (mantenha este sistema visual em TODOS os slides deste carrossel — mesma família tipográfica, margens, densidade e linguagem gráfica; não reproduza logos/marcas nem composições idênticas às fotos de referência):\n${referenceDescription}\n`
    : ''

  const ctaColors = isCTA
    ? `- Fundo do slide: ${s.ctaBackgroundColor}\n- Cor do texto: ${s.ctaTextColor}`
    : `- Fundo do slide: ${s.backgroundColor}\n- Cor do texto: ${s.textColor}`

  const prompt = `Post profissional para Instagram carrossel. Proporção 4:5 (portrait), 1080x1350px. Slide ${slide.slide_number} de tipo "${typeLabel}".

CORES:
- Cor primária/destaque: ${s.primaryColor}
${ctaColors}
${dsNote}${refNote}
TEXTOS QUE DEVEM APARECER NA IMAGEM (exatamente como especificado):
${contentLines.join('\n') || 'Sem texto'}

LAYOUT: ${layoutDesc}
Alinhamento de texto: ${alignLabel}
Padding interno: ${s.padding}px nas bordas

REQUISITOS:
- Design editorial de alto nível, moderno e profissional
- Todos os textos acima DEVEM estar visíveis e legíveis na imagem
- Tipografia limpa, hierarquia visual clara
- CONSISTÊNCIA: este slide deve parecer da mesma série que os demais do carrossel (mesmo vocabulário formal de layout das referências + design system)
- Sem marcas d'água, sem logos externos, sem bordas desnecessárias
- Estilo Instagram/LinkedIn carrossel profissional`

  return generateSlideImage(prompt)
}
