# Prompt para correção — carrossel com IA (texto + imagens)

Material de apoio para **alunos** que estão a montar ou corrigir um fluxo parecido ao do projeto **Social Attack**: geração de copy dos slides, prompts por slide e geração de imagens com consistência visual.

Documentação técnica detalhada do repositório: [`continuidade-fluxo-carrossel-ia.md`](continuidade-fluxo-carrossel-ia.md).

---

## 1. O que este guia cobre

Em projetos de carrossel para redes sociais (ex.: Instagram 4:5), é comum aparecerem três falhas ao usar uma só chamada genérica à IA:

| Problema | Sintoma para o utilizador |
|----------|---------------------------|
| Texto fraco ou inventado | Preços, datas ou “facts” que não estão nas fontes; frases cortadas; “CTA 5”, “Slide 3” no meio da mensagem |
| Cada slide parece de outra marca | Um slide escuro editorial, outro roxo com mockup 3D, outro só texto — sem hierarquia comum |
| A pipeline rebenta a meio | Erro **503** ou **429** no modelo “Pro”; depois **não há imagens** porque o texto ou o prompt intermédio falhou |

O que foi feito no código foi **separar responsabilidades**, **escolher modelos certos para cada tarefa**, **endurecer instruções nos prompts** e **retentar com backoff** quando a API está sob pressão.

---

## 2. Princípio central: duas fases bem definidas

1. **Fase copy (só texto estruturado)** — JSON ou campos claros (capa, corpo, CTA), sem misturar paleta ou “layout” demasiado cedo.
2. **Fase visual (por slide)** — Um **prompt criativo por slide** (narrativa + design system resumido + análise das imagens de referência), depois a chamada ao **gerador de imagem**.

Se tentares gerar imagem direto a partir de um briefing vago, o modelo improvisa estilo slide a slide. Por isso existe **`montarPromptImagemSlide`** (direção antes da imagem) e **`gerarSlideCompleto`** (prompt final com textos exatos e tokens de cor).

---

## 3. Texto: dois níveis de modelo

**Ideia:** tarefas “caras” em qualidade (copy, análise de referências, direção de arte em texto) usam um modelo **mais forte**; tarefas repetitivas e baratas (extrair tokens do markdown do DS, resumir guia para um brief curto) usam um modelo **rápido**.

- **Qualidade (default `gemini-2.5-pro`):** roteiro dos slides, ideias, regeneração de campo, prompts de imagem, visão sobre prints do design system.
- **Rápido (default `gemini-2.5-flash`):** parsing/resumo do design system sem inventar copy de slide.

Quando o **Pro** responde **503** (“high demand”) ou **429**, o fluxo **repete** com espera crescente (**backoff exponencial**) e, se ainda falhar por erro transitório, **cai para o Flash** para não bloquear o utilizador.

### Regras de copy que devem ir no prompt (anti-alucinação)

Para passares isto aos alunos como **checklist de prompt**:

- O tema e os factos vêm **apenas** do título, descrição e referências fornecidas pelo utilizador.
- **Proibido** inventar preços, percentagens, datas ou números específicos que não apareçam explicitamente nessas fontes.
- **Proibido** no texto final: “CTA 5”, “Slide 2”, “placeholder”, meta-instruções entre parênteses.
- Pedir **frases completas** em português claro.

Opcionalmente, no código, aplica-se um **pós-processamento** nos campos para remover lixo tipo `CTA 5` se o modelo escapulir-se na mesma.

---

## 4. Imagem: dois caminhos (nativo Gemini → Imagen)

**Ideia:** usar primeiro modelos que geram imagem **no mesmo endpoint** `generateContent` (modalidades texto + imagem), com **aspect ratio** adequado ao feed (**4:5**). Se isso falhar ou não devolver `inlineData`, usa-se **Imagen** (`imagen-4.0-*`) via `:predict`.

Ordem típica de modelos nativos (configurável):

1. `gemini-3-pro-image-preview` (referência comercial próxima ao “Nano Banana Pro” / imagem de alta qualidade na documentação Google).
2. `gemini-2.5-flash-image` como fallback mais leve.

No **Imagen**, muitas vezes **4:5** não está disponível na API; o projeto **mapeia 4:5 → 3:4** para manter retrato próximo ao feed.

### Resiliência na imagem

Os mesmos tipos de erro transitório (**429**, **500**, **502**, **503**) também disparam **retries com backoff** nas chamadas **nativas** e no **Imagen**, para picos de tráfego não matarem o carrossel inteiro.

---

## 5. Consistência visual: o que pedir nos prompts

Para os slides **parecerem o mesmo template**:

- Descrever **um único sistema**: margens, hierarquia (tag → headline → corpo), paleta e alinhamento repetidos.
- **Slides de corpo** devem **partilhar a mesma estrutura** entre si; só a fotografia ou ilustração de apoio pode variar com o subtema.
- **Capa e CTA** seguem o mesmo “vocabulário” de layout das referências; no CTA altera-se sobretudo **fundo** e **cores de CTA**, não o grid inteiro.
- **Proibir** na arte: smartphone mockup, laptop, wireframe, “página de documentação” como tema principal — salvo ser isso o produto do cliente.

Quando há **imagens de referência do design system**, o fluxo ideal é **multimodal**: anexar os pixels e pedir ao modelo de texto uma **única direção** alinhada às zonas (hero, rodapé, tipografia).

---

## 6. Erro comum no browser (não é da app)

**“Could not establish connection. Receiving end does not exist”** — na maior parte dos casos vem de **extensões do Chrome**, não do teu código ou da API Gemini. Vale testar em **janela anónima** sem extensões.

---

## 7. Variáveis de ambiente (resumo para configurar o projeto)

Coloca no `.env` (nunca commits com chave real em público):

| Variável | Para que serve |
|----------|----------------|
| `VITE_GEMINI_API_KEY` | Chave da Google AI / Gemini (obrigatória). |
| `VITE_GEMINI_TEXT_MODEL_QUALITY` | Modelo forte para copy e prompts (default: `gemini-2.5-pro`). |
| `VITE_GEMINI_TEXT_MODEL_FAST` | Modelo rápido para tarefas leves (default: `gemini-2.5-flash`). |
| `VITE_GEMINI_TEXT_RETRIES` | Tentativas por modelo no texto (default 4, máximo 8). |
| `VITE_GEMINI_TEXT_RETRY_BASE_MS` | Milissegundos base do backoff (default 1200); também influencia imagem. |
| `VITE_GEMINI_IMAGE_NATIVE_MODELS` | Lista CSV dos modelos nativos com imagem (ordem de tentativa). |
| `VITE_GEMINI_IMAGE_RETRIES` | Tentativas por chamada de imagem (default 3, máximo 6). |

Se quiseres **evitar o Pro** em alturas de pico, podes definir `VITE_GEMINI_TEXT_MODEL_QUALITY=gemini-2.5-flash` (menos qualidade de raciocínio, mais disponibilidade).

---

## 8. Prompt mestre (para colar no Cursor / Claude noutro projeto)

Usa o bloco abaixo como **pedido de implementação** ou **revisão** quando fores ensinar os alunos a corrigir um fluxo parecido:

```text
Objetivo: corrigir geração de carrossel (Instagram ~4:5) com IA.

Requisitos:
1) Separar geração de COPY (JSON estruturado: cover/body/cta) da geração de IMAGEM por slide.
2) Texto: usar modelo mais forte para copy/prompts/análise visual; modelo mais barato só para extrair tokens do design system e brief curto. Em 429/503 no modelo forte, retries com backoff exponencial e fallback para o modelo rápido.
3) Copy: instruções explícitas anti-alucinação — não inventar números/preços/datas fora das fontes; proibir "CTA N", "Slide N", placeholders; português com frases completas; sanitizar campos após parse se necessário.
4) Imagem: primeiro tentar generateContent com responseModalities TEXT+IMAGE e imageConfig.aspectRatio 4:5 (modelos tipo gemini-3-pro-image-preview, depois flash-image); extrair inlineData base64; se falhar, fallback Imagen :predict (mapear 4:5→3:4 se a API não suportar 4:5).
5) Retries com backoff também nas chamadas de imagem (nativo e Imagen).
6) Consistência: em todo o pipeline de prompt final, exigir UM template — mesmas margens, mesma hierarquia tipográfica relativa, corpos com mesma estrutura; CTA só muda fundo/cores de CTA conforme tokens; proibir mockups de dispositivo e documentação como tema principal.
7) Documentar variáveis VITE_* para modelos e retries.

Implementar em camadas (serviço/hook), sem expor chaves no cliente de forma insegura em produção — para produção real considerar proxy/backend.
```

*(Em produção com utilizadores reais, chamar APIs só no browser com chave exposta é um risco; este projeto usa Vite — idealmente Edge Function ou backend para chaves. Inclui isto como nota avançada para alunos.)*

---

## 9. Fluxo em uma frase

**Extrair estilo do DS → gerar copy dos slides → por slide montar direção criativa (com refs visuais se existirem) → montar prompt final com textos exatos e tokens → gerar imagem (nativo 4:5 ou Imagen) com retries.**

---

*Documento pedagógico derivado das correções aplicadas no Social Attack. Para detalhe de ficheiros e funções, ver [`continuidade-fluxo-carrossel-ia.md`](continuidade-fluxo-carrossel-ia.md).*
