const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
const GEMINI_TEXT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
const GEMINI_IMAGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`

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
  const pattern = arrayWrapper ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const match = text.match(pattern)
  if (!match) throw new Error('Resposta inválida do Gemini: JSON não encontrado')
  return JSON.parse(match[0]) as T
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

export async function generateSlideImage(slideText: string): Promise<string> {
  const prompt = `${slideText}. Estilo: flat illustration, paleta pastel suave, sem texto na imagem, fundo limpo e minimalista. Proporção 1:1.`

  const response = await fetch(GEMINI_IMAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
