const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
const GEMINI_IMAGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`

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
