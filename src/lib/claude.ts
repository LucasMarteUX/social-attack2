import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

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

export async function generateIdeas(
  categoriaNome: string,
  categoriaDescricao: string,
  referencias: string,
  quantidade = 5
): Promise<IdeaSuggestion[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Você é um estrategista de conteúdo para redes sociais.
Com base no tema "${categoriaNome}" (${categoriaDescricao}) e nestas referências: ${referencias || 'nenhuma referência fornecida'},
sugira ${quantidade} ideias de posts para Instagram no formato carrossel.
Para cada ideia, forneça: título curto e descrição de 2 linhas.
Responda APENAS com JSON válido no formato: [{"titulo": "...", "descricao": "..."}]`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  return JSON.parse(jsonMatch[0]) as IdeaSuggestion[]
}

export async function generateCarouselScript(
  tema: string,
  tom: string,
  publico: string,
  cta: string,
  qtdSlides: number
): Promise<CarouselScript> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Crie um carrossel de Instagram com ${qtdSlides} slides sobre "${tema}".
Tom de voz: ${tom}. Público-alvo: ${publico}. Call-to-action: ${cta}.
Responda APENAS com JSON válido no formato:
{
  "titulo": "...",
  "slides": [{"numero": 1, "texto": "..."}, ...],
  "legenda": "...",
  "hashtags": ["...", ...]
}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta inválida da Claude API')
  return JSON.parse(jsonMatch[0]) as CarouselScript
}

export async function summarizeUrl(url: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Resuma em 3 linhas o conteúdo principal desta URL para uso como referência de conteúdo para redes sociais: ${url}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
