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
  slides: NodeSlide[]
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

  const dsBlock = designSystemMarkdown
    ? `\nDesign System (consulte ao criar os textos):\n${designSystemMarkdown}\n`
    : ''

  const prompt = `Você é um especialista em criação de conteúdo para Instagram.
Crie um carrossel com exatamente ${totalSlides} slides sobre: "${titulo}".
Descrição: ${descricao || 'não fornecida'}.
Tom de voz: ${tomNome}${tomDescricao ? ` — ${tomDescricao}` : ''}.
${dsBlock}${refBlock ? `\n${refBlock}\n` : ''}
ESTRUTURA OBRIGATÓRIA:
- Slide 1: tipo "cover" — tag (categoria/tema em 2-3 palavras), headline (título impactante), subheadline (frase complementar curta)
- Slides 2 até ${totalSlides - 1}: tipo "body" — headline (ponto principal) + body_paragraph (desenvolvimento, 2-3 linhas)
- Slide ${totalSlides}: tipo "cta" — cta_message (chamada para seguir o perfil ou salvar o post)

Regras:
- Textos diretos, sem prolixidade
- Se há URLs de referência, pesquise e use o conteúdo dessas fontes
- Responda APENAS com JSON válido, sem texto extra

Formato:
{
  "slides": [
    { "slide_number": 1, "slide_type": "cover", "tag_text": "...", "headline": "...", "subheadline": "..." },
    { "slide_number": 2, "slide_type": "body", "headline": "...", "body_paragraph": "..." },
    { "slide_number": ${totalSlides}, "slide_type": "cta", "cta_message": "..." }
  ]
}`

  const text = await callGemini(prompt, hasUrls)
  return extrairJSON<NodeCarouselScript>(text, false)
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

export async function generateSlideImage(slideText: string): Promise<string> {
  const prompt = `${slideText}. Estilo: flat illustration, paleta pastel suave, sem texto na imagem, fundo limpo e minimalista. Proporção 1:1.`

  const response = await fetch(GEMINI_IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1' },
    }),
  })

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = await response.json()
  const base64 = data.predictions?.[0]?.bytesBase64Encoded
  if (!base64) throw new Error('Nenhuma imagem retornada pelo Gemini')

  return `data:image/png;base64,${base64}`
}
