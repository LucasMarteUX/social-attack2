// Dados mockados — substituir por Supabase na próxima etapa

export interface Categoria {
  id: string
  nome: string
  descricao: string
  cor: string
  icone: string
  criado_em: string
}

export interface Referencia {
  tipo: 'url' | 'texto'
  valor: string
}

export interface Ideia {
  id: string
  categoria_id: string
  titulo: string
  descricao: string
  favorita: boolean
  referencias: Referencia[]
  conteudo_gerado: boolean
  criado_em: string
}

export interface Slide {
  numero: number
  texto: string
  url_imagem: string
}

export interface Criativo {
  id: string
  ideia_id: string
  categoria_id: string
  titulo: string
  tipo: 'carrossel' | 'imagem_unica' | 'reels_roteiro'
  status: 'rascunho' | 'revisao' | 'pronto' | 'agendado' | 'publicado'
  slides: Slide[]
  legenda: string
  hashtags: string[]
  prompt_imagem: string
  criado_em: string
  atualizado_em: string
}

export interface Agendamento {
  id: string
  criativo_id: string
  data_publicacao: string
  plataforma: 'instagram' | 'linkedin' | 'twitter'
  status: 'agendado' | 'publicado' | 'cancelado'
  notas: string
}

export interface Todo {
  id: string
  titulo: string
  concluida: boolean
  prazo: string | null
  prioridade: 'baixa' | 'media' | 'alta'
  criado_em: string
}

export interface TomDeVoz {
  id: string
  nome: string
  descricao: string
  exemplo: string
  criado_em: string
}

// ─── Categorias ───────────────────────────────────────────────────────────────

export const mockCategorias: Categoria[] = [
  {
    id: 'cat-1',
    nome: 'Marketing Digital',
    descricao: 'Conteúdos sobre estratégias, growth e tendências de marketing',
    cor: '#6D28D9',
    icone: 'TrendingUp',
    criado_em: '2026-04-10T10:00:00Z',
  },
  {
    id: 'cat-2',
    nome: 'Nutrição & Saúde',
    descricao: 'Dicas de alimentação, receitas saudáveis e bem-estar',
    cor: '#65A30D',
    icone: 'Salad',
    criado_em: '2026-04-11T09:00:00Z',
  },
  {
    id: 'cat-3',
    nome: 'Produtividade',
    descricao: 'Técnicas de foco, gestão de tempo e organização pessoal',
    cor: '#0891B2',
    icone: 'Timer',
    criado_em: '2026-04-12T08:30:00Z',
  },
  {
    id: 'cat-4',
    nome: 'Finanças Pessoais',
    descricao: 'Educação financeira, investimentos e independência financeira',
    cor: '#BE185D',
    icone: 'PiggyBank',
    criado_em: '2026-04-13T11:00:00Z',
  },
  {
    id: 'cat-5',
    nome: 'Tecnologia & IA',
    descricao: 'Inovações em IA, ferramentas digitais e futuro do trabalho',
    cor: '#E55A30',
    icone: 'Bot',
    criado_em: '2026-04-14T14:00:00Z',
  },
]

// ─── Ideias ───────────────────────────────────────────────────────────────────

export const mockIdeias: Ideia[] = [
  {
    id: 'ideia-1',
    categoria_id: 'cat-1',
    titulo: '5 erros que matam seu alcance no Instagram',
    descricao: 'Um carrossel revelando os erros mais comuns que criadores cometem e como corrigir cada um deles.',
    favorita: true,
    referencias: [
      { tipo: 'url', valor: 'https://blog.hootsuite.com/instagram-algorithm' },
      { tipo: 'texto', valor: 'Algoritmo prioriza salvamentos e compartilhamentos acima de likes' },
    ],
    conteudo_gerado: true,
    criado_em: '2026-04-15T10:00:00Z',
  },
  {
    id: 'ideia-2',
    categoria_id: 'cat-1',
    titulo: 'Como criar uma estratégia de conteúdo do zero',
    descricao: 'Guia passo a passo para quem está começando a criar conteúdo e não sabe por onde começar.',
    favorita: false,
    referencias: [
      { tipo: 'texto', valor: 'Comece definindo 3 pilares de conteúdo antes de postar qualquer coisa' },
    ],
    conteudo_gerado: false,
    criado_em: '2026-04-16T09:30:00Z',
  },
  {
    id: 'ideia-3',
    categoria_id: 'cat-1',
    titulo: 'O poder do storytelling nas redes sociais',
    descricao: 'Como usar narrativas pessoais para aumentar o engajamento e criar conexão com a audiência.',
    favorita: true,
    referencias: [],
    conteudo_gerado: false,
    criado_em: '2026-04-17T11:00:00Z',
  },
  {
    id: 'ideia-4',
    categoria_id: 'cat-2',
    titulo: '7 alimentos que aumentam seu foco e energia',
    descricao: 'Apresentar alimentos funcionais com embasamento científico de forma visual e atrativa.',
    favorita: true,
    referencias: [
      { tipo: 'url', valor: 'https://www.healthline.com/nutrition/brain-food' },
    ],
    conteudo_gerado: true,
    criado_em: '2026-04-15T08:00:00Z',
  },
  {
    id: 'ideia-5',
    categoria_id: 'cat-2',
    titulo: 'Café da manhã completo em 10 minutos',
    descricao: 'Receitas rápidas e nutritivas para quem tem pouco tempo pela manhã.',
    favorita: false,
    referencias: [],
    conteudo_gerado: false,
    criado_em: '2026-04-18T07:30:00Z',
  },
  {
    id: 'ideia-6',
    categoria_id: 'cat-3',
    titulo: 'Técnica Pomodoro: como usar do jeito certo',
    descricao: 'Desmistificar a técnica e mostrar variações para diferentes tipos de trabalho.',
    favorita: false,
    referencias: [
      { tipo: 'texto', valor: 'Pomodoro padrão: 25min foco + 5min pausa. Depois de 4 ciclos, 20min de pausa longa.' },
    ],
    conteudo_gerado: false,
    criado_em: '2026-04-16T13:00:00Z',
  },
  {
    id: 'ideia-7',
    categoria_id: 'cat-4',
    titulo: 'Regra dos 50-30-20: organize seu salário',
    descricao: 'Explicar a regra de forma visual e prática com exemplos reais de orçamento.',
    favorita: true,
    referencias: [
      { tipo: 'url', valor: 'https://www.nerdwallet.com/article/finance/nerdwallet-budget-calculator' },
    ],
    conteudo_gerado: true,
    criado_em: '2026-04-14T10:00:00Z',
  },
  {
    id: 'ideia-8',
    categoria_id: 'cat-5',
    titulo: '10 ferramentas de IA que vão mudar seu trabalho',
    descricao: 'Curadoria das melhores ferramentas de IA para criadores de conteúdo e profissionais de marketing.',
    favorita: true,
    referencias: [
      { tipo: 'texto', valor: 'Claude, Midjourney, Notion AI, Perplexity, Runway, ElevenLabs' },
    ],
    conteudo_gerado: true,
    criado_em: '2026-04-13T15:00:00Z',
  },
]

// ─── Criativos ────────────────────────────────────────────────────────────────

export const mockCriativos: Criativo[] = [
  {
    id: 'cri-1',
    ideia_id: 'ideia-1',
    categoria_id: 'cat-1',
    titulo: '5 erros que matam seu alcance no Instagram',
    tipo: 'carrossel',
    status: 'pronto',
    slides: [
      {
        numero: 1,
        texto: 'Você está cometendo esses 5 erros no Instagram sem saber 👇',
        url_imagem: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
      },
      {
        numero: 2,
        texto: 'Erro #1: Postar sem consistência. O algoritmo favorece perfis que publicam regularmente.',
        url_imagem: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
      },
      {
        numero: 3,
        texto: 'Erro #2: Ignorar os primeiros 30 minutos. Responda todos os comentários logo após postar.',
        url_imagem: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&q=80',
      },
      {
        numero: 4,
        texto: 'Erro #3: Não usar CTA. Peça sempre uma ação: salvar, compartilhar, comentar.',
        url_imagem: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      },
      {
        numero: 5,
        texto: 'Erro #4: Caption sem gancho. As primeiras 2 linhas decidem se a pessoa vai ler.',
        url_imagem: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
      },
    ],
    legenda: 'Você provavelmente está cometendo pelo menos 1 desses erros agora mesmo. Salva esse post para não esquecer! 💾\n\nQual deles te identificou mais? Comenta aqui 👇',
    hashtags: ['#instagram', '#marketingdigital', '#conteudo', '#criadores', '#alcance'],
    prompt_imagem: 'flat illustration, social media analytics, pastel purple tones, minimal background',
    criado_em: '2026-04-20T14:00:00Z',
    atualizado_em: '2026-04-21T09:00:00Z',
  },
  {
    id: 'cri-2',
    ideia_id: 'ideia-4',
    categoria_id: 'cat-2',
    titulo: '7 alimentos que aumentam seu foco',
    tipo: 'carrossel',
    status: 'agendado',
    slides: [
      {
        numero: 1,
        texto: 'Sua alimentação está sabotando seu foco? Veja os 7 alimentos que vão mudar isso 🧠',
        url_imagem: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
      },
      {
        numero: 2,
        texto: '#1 Nozes: ricas em ômega-3, melhoram a memória e concentração.',
        url_imagem: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=80',
      },
      {
        numero: 3,
        texto: '#2 Mirtilos: antioxidantes que protegem o cérebro do envelhecimento.',
        url_imagem: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=800&q=80',
      },
    ],
    legenda: 'O que você coloca no prato afeta diretamente o que você consegue fazer no trabalho. Salva para consultar! 🥗',
    hashtags: ['#nutricao', '#saude', '#foco', '#produtividade', '#bemestar'],
    prompt_imagem: 'flat illustration, healthy food, green and pastel tones, minimal',
    criado_em: '2026-04-19T10:00:00Z',
    atualizado_em: '2026-04-19T16:00:00Z',
  },
  {
    id: 'cri-3',
    ideia_id: 'ideia-7',
    categoria_id: 'cat-4',
    titulo: 'Regra dos 50-30-20 explicada',
    tipo: 'carrossel',
    status: 'rascunho',
    slides: [
      {
        numero: 1,
        texto: 'Não sabe para onde vai seu salário todo mês? Essa regra simples vai te salvar 💰',
        url_imagem: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
      },
      {
        numero: 2,
        texto: '50% para necessidades: moradia, alimentação, transporte, contas fixas.',
        url_imagem: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80',
      },
    ],
    legenda: 'Regra simples, resultado transformador. Qual porcentagem você mais precisa ajustar? 👇',
    hashtags: ['#financaspessoais', '#educacaofinanceira', '#dinheiro', '#investimentos'],
    prompt_imagem: 'flat illustration, personal finance, pie chart, pastel colors, minimal',
    criado_em: '2026-04-18T11:00:00Z',
    atualizado_em: '2026-04-18T11:00:00Z',
  },
  {
    id: 'cri-4',
    ideia_id: 'ideia-8',
    categoria_id: 'cat-5',
    titulo: '10 ferramentas de IA para criadores',
    tipo: 'carrossel',
    status: 'publicado',
    slides: [
      {
        numero: 1,
        texto: '10 ferramentas de IA que estão mudando o trabalho de criadores de conteúdo 🤖',
        url_imagem: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
      },
      {
        numero: 2,
        texto: '#1 Claude: geração de texto, roteiros e estratégias com qualidade impressionante.',
        url_imagem: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
      },
    ],
    legenda: 'A IA não vai tirar seu emprego. Mas quem souber usar IA vai. Salva esse post! 🚀',
    hashtags: ['#ia', '#inteligenciaartificial', '#ferramentas', '#tecnologia', '#criadores'],
    prompt_imagem: 'flat illustration, AI tools, digital workspace, purple and blue tones',
    criado_em: '2026-04-10T09:00:00Z',
    atualizado_em: '2026-04-15T12:00:00Z',
  },
]

// ─── Agenda ───────────────────────────────────────────────────────────────────

export const mockAgenda: Agendamento[] = [
  {
    id: 'age-1',
    criativo_id: 'cri-2',
    data_publicacao: '2026-05-14T10:00:00Z',
    plataforma: 'instagram',
    status: 'agendado',
    notas: 'Publicar pela manhã para maior alcance',
  },
  {
    id: 'age-2',
    criativo_id: 'cri-4',
    data_publicacao: '2026-04-28T09:00:00Z',
    plataforma: 'instagram',
    status: 'publicado',
    notas: '',
  },
  {
    id: 'age-3',
    criativo_id: 'cri-1',
    data_publicacao: '2026-05-20T18:00:00Z',
    plataforma: 'instagram',
    status: 'agendado',
    notas: 'Testar horário noturno',
  },
]

// ─── To-Dos ───────────────────────────────────────────────────────────────────

export const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    titulo: 'Gravar Reels sobre algoritmo do Instagram',
    concluida: false,
    prazo: '2026-05-15',
    prioridade: 'alta',
    criado_em: '2026-05-11T08:00:00Z',
  },
  {
    id: 'todo-2',
    titulo: 'Criar calendário de conteúdo para junho',
    concluida: false,
    prazo: '2026-05-20',
    prioridade: 'alta',
    criado_em: '2026-05-11T08:30:00Z',
  },
  {
    id: 'todo-3',
    titulo: 'Revisar legenda do carrossel de finanças',
    concluida: false,
    prazo: '2026-05-12',
    prioridade: 'media',
    criado_em: '2026-05-10T15:00:00Z',
  },
  {
    id: 'todo-4',
    titulo: 'Responder DMs pendentes no Instagram',
    concluida: true,
    prazo: null,
    prioridade: 'media',
    criado_em: '2026-05-09T10:00:00Z',
  },
  {
    id: 'todo-5',
    titulo: 'Pesquisar tendências de conteúdo para maio',
    concluida: true,
    prazo: null,
    prioridade: 'baixa',
    criado_em: '2026-05-08T09:00:00Z',
  },
  {
    id: 'todo-6',
    titulo: 'Atualizar bio do Instagram com novo CTA',
    concluida: false,
    prazo: '2026-05-25',
    prioridade: 'baixa',
    criado_em: '2026-05-11T09:00:00Z',
  },
]
