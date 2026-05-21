# Base de Conhecimento — Social Attack
**Versão 1.0 — Maio 2026**
*Documento de treinamento para o agente de atendimento via WhatsApp*

---

## PARTE 1 — HISTÓRIA E VISÃO DO PRODUTO

### O que é o Social Attack?

Social Attack é uma plataforma web de criação e gestão de conteúdo para redes sociais. Funciona como um "cérebro criativo" centralizado: o usuário organiza referências, brainstorma ideias por categoria e transforma essas ideias em conteúdo publicável — com texto gerado por inteligência artificial e imagens geradas automaticamente.

O foco da versão atual é a produção de carrosséis para o Instagram, mas o sistema foi construído de forma extensível para outros formatos e plataformas.

### Por que o Social Attack foi criado?

Criadores de conteúdo e times de marketing não tinham um lugar único para organizar referências, brainstormar ideias e gerar conteúdo de forma estruturada. O processo estava fragmentado: ideias em um documento, referências salvas em abas do navegador, imagens geradas em ferramentas separadas, agenda em outro app.

O Social Attack une tudo isso em uma única interface inteligente.

### Para quem é o Social Attack?

- Criadores de conteúdo solo (influenciadores, freelancers)
- Social media managers
- Times de marketing pequenos e médios
- Agências que gerenciam múltiplos perfis de clientes

### Qual é a tecnologia por trás?

O Social Attack foi desenvolvido com React e Tailwind CSS no frontend, Supabase (PostgreSQL) como banco de dados, Claude API da Anthropic para geração de textos e Gemini API do Google para geração de imagens. O deploy é feito na Vercel.

---

## PARTE 2 — MÓDULOS E FUNCIONALIDADES

### Módulo 1 — Categorias

**O que é:** As categorias são universos temáticos que organizam todo o conteúdo do usuário. Cada categoria agrupa ideias e criativos relacionados a um mesmo tema.

**Exemplos de categorias:** "Produtividade", "Finanças Pessoais", "Marketing Digital", "Receitas Saudáveis", "Desenvolvimento Pessoal".

**O que o usuário pode fazer:**
- Criar categorias com nome, descrição, cor e ícone personalizados
- Editar e excluir categorias existentes
- Ver quantas ideias e criativos cada categoria possui
- Clicar em uma categoria para acessar sua biblioteca de ideias interna

**Como criar uma categoria:**
1. Acesse "Categorias" na sidebar
2. Clique em "Nova categoria"
3. Preencha o nome (obrigatório), descrição (opcional), escolha uma cor e um ícone
4. Clique em salvar

---

### Módulo 2 — Biblioteca de Ideias

**O que é:** Repositório de ideias organizadas dentro de cada categoria. É o brainstorm estruturado do sistema — onde nascem todos os conteúdos.

**O que o usuário pode fazer:**
- Criar ideias manualmente (título + descrição)
- Gerar ideias automaticamente via IA com base no tema da categoria e nas referências adicionadas
- Editar e excluir ideias
- Marcar ideias como favoritas
- Filtrar por: todas, favoritas, com conteúdo gerado, sem conteúdo gerado
- Adicionar referências a cada ideia (URL, texto livre, link de pesquisa)
- Iniciar a geração de conteúdo (carrossel) a partir de uma ideia

**Como gerar ideias com IA:**
1. Entre em uma categoria
2. Clique em "Gerar ideias com IA"
3. A IA analisa o tema da categoria e as referências adicionadas
4. Um conjunto de ideias é gerado automaticamente
5. O usuário pode aprovar, editar ou descartar cada ideia

**O que são referências:**
Referências são informações que enriquecem uma ideia. Podem ser:
- URLs de artigos, vídeos ou posts que serviram de inspiração
- Textos livres com anotações, citações ou contexto adicional
- Links que o sistema busca automaticamente e sumariza com IA

---

### Módulo 3 — Criativos

**O que é:** A geração e gestão do conteúdo publicável. É o produto final do Social Attack — onde uma ideia se transforma em carrossel pronto para publicação.

**Fluxo de criação de um carrossel:**

1. **Briefing** — O usuário define:
   - Tema central do carrossel
   - Tom de voz desejado
   - Quantidade de slides (geralmente 5 a 10)
   - Público-alvo
   - Call-to-action (o que o seguidor deve fazer ao final)

2. **Geração de texto** — A IA (Claude) gera o roteiro completo:
   - Título do carrossel (slide de capa)
   - Texto de cada slide
   - Legenda do post
   - Hashtags sugeridas

3. **Revisão** — O usuário pode editar qualquer parte do texto antes de avançar

4. **Geração de imagens** — A IA (Gemini) gera as imagens dos slides com base no texto e no estilo visual escolhido

5. **Exportação** — Download das imagens + texto da legenda prontos para publicar

**Tons de voz disponíveis:**
- Educativo — transmite conhecimento de forma didática
- Inspiracional — motiva e eleva o leitor
- Provocador — gera questionamento e engajamento
- Direto e objetivo — vai direto ao ponto, sem enrolação
- Humorístico — usa leveza e humor para comunicar
- Storytelling — conta uma história para engajar

**Status de um criativo:**
- Rascunho — em construção, ainda não revisado
- Revisão — texto gerado, aguardando aprovação do usuário
- Pronto — aprovado e pronto para agendamento ou publicação
- Agendado — data de publicação definida na agenda
- Publicado — já foi ao ar

**Proporção dos cards:** Todos os criativos seguem a proporção 1080×1350px (4:5), padrão do Instagram para carrosséis.

---

### Módulo 4 — Agenda de Posts

**O que é:** Planejamento visual de quando cada criativo será publicado. Funciona como um calendário editorial integrado ao sistema.

**O que o usuário pode fazer:**
- Visualizar todos os posts agendados em um calendário mensal
- Atribuir um criativo a uma data e horário específicos
- Visualizar a agenda em formato de lista cronológica
- Marcar posts como publicados ou cancelar agendamentos

**Plataformas suportadas para agendamento:**
- Instagram
- LinkedIn
- Twitter/X

*Importante: o Social Attack planeja e organiza o agendamento, mas a publicação ainda é manual na v1. Não há integração direta com as APIs das redes sociais nesta versão.*

---

### Módulo 5 — To-Do

**O que é:** Lista de tarefas simples e rápida para organizar o fluxo de trabalho de criação de conteúdo.

**O que o usuário pode fazer:**
- Criar tarefas com título, prazo e prioridade
- Marcar tarefas como concluídas
- Filtrar por: todas, pendentes, concluídas
- Ordenar por data, prazo ou prioridade

**Prioridades disponíveis:** Alta, Média, Baixa

**Destaque visual:** Tarefas com prazo em menos de 24 horas recebem indicador de urgência.

---

## PARTE 3 — INTELIGÊNCIA ARTIFICIAL

### Que IA o Social Attack usa?

O Social Attack integra duas IAs líderes de mercado:

- **Claude (Anthropic)** — responsável por toda geração de texto: ideias, roteiros de carrossel, legendas, hashtags e sumarização de referências
- **Gemini (Google)** — responsável pela geração de imagens dos slides via Imagen

### Por que duas IAs diferentes?

Cada IA tem um ponto forte distinto. Claude é reconhecido como uma das melhores IAs para geração de texto em português, com capacidade superior de seguir instruções de tom de voz. O Gemini/Imagen é uma das soluções mais avançadas para geração de imagens com qualidade comercial.

### A IA do Social Attack aprende com o meu conteúdo?

Não. As IAs integradas ao Social Attack são chamadas via API a cada geração — elas não são treinadas com o conteúdo do usuário. Cada geração é independente e as informações do usuário não são usadas para treinar nenhum modelo.

### A IA consegue gerar conteúdo em português?

Sim. Claude e Gemini têm excelente performance em português brasileiro. O usuário pode escrever briefings em português e receber todo o conteúdo gerado em português.

### Posso editar o conteúdo gerado pela IA?

Sim. Todo texto gerado pela IA passa por uma etapa de revisão onde o usuário pode editar livremente antes de avançar para a geração de imagens.

### A IA entende meu tom de voz?

Sim. O usuário seleciona um dos tons de voz disponíveis no briefing, e a IA adapta o texto gerado para aquele estilo. Quanto mais detalhado o briefing, mais precisa é a geração.

---

## PARTE 4 — PLANOS E PREÇOS

### O Social Attack é gratuito?

O Social Attack oferece um plano gratuito com funcionalidades essenciais. Para acesso completo às funcionalidades de IA e geração de imagens, existem planos pagos.

### Quais são os planos disponíveis?

**Plano Gratuito**
- Até 5 criativos por mês
- Até 3 categorias
- Geração de texto com IA (Claude)
- Sem geração de imagens
- Sem agendamento avançado

**Plano Pro — R$ 79/mês**
- Criativos ilimitados
- Categorias ilimitadas
- Geração de texto com IA (Claude)
- Geração de imagens com IA (Gemini/Imagen) — até 30 imagens/mês
- Agenda editorial completa
- Suporte prioritário via WhatsApp

**Plano Agência — R$ 199/mês**
- Tudo do Plano Pro
- Gestão de múltiplos perfis/clientes
- Até 100 imagens geradas por mês
- Suporte dedicado
- Onboarding personalizado

### Como assinar um plano?

Acesse o menu de conta no canto superior direito da plataforma, clique em "Planos" e selecione o plano desejado. O pagamento é processado via cartão de crédito.

### Posso cancelar quando quiser?

Sim. O cancelamento pode ser feito a qualquer momento sem multa. O acesso continua até o final do período pago.

### Tem período de teste gratuito?

Sim. Os planos Pro e Agência oferecem 14 dias de teste gratuito sem necessidade de cartão de crédito.

---

## PARTE 5 — PERGUNTAS FREQUENTES (FAQ)

### Sobre o produto

**O Social Attack funciona no celular?**
Sim. A interface é responsiva e funciona em dispositivos móveis. No mobile, a sidebar vira um menu deslizante. Para uma experiência completa de edição, recomendamos o uso no desktop.

**Há um aplicativo mobile?**
Não na versão atual. O Social Attack funciona como aplicativo web, acessível pelo navegador. Um app nativo está previsto para versões futuras.

**Quais navegadores são suportados?**
O Social Attack funciona nos navegadores modernos: Google Chrome, Firefox, Safari e Edge nas versões atuais. Recomendamos o Chrome para melhor performance.

**Preciso instalar alguma coisa?**
Não. O Social Attack é uma plataforma web — basta acessar pelo navegador, sem instalação.

**Posso usar com múltiplos perfis de Instagram?**
Na v1 atual, o sistema é single-user sem distinção de perfis. O Plano Agência permite gerenciar múltiplos clientes com separação por categorias. Suporte a múltiplos perfis distintos está previsto para versões futuras.

---

### Sobre criação de conteúdo

**Quantos slides posso ter em um carrossel?**
O sistema suporta de 3 a 15 slides por carrossel. O ideal para engajamento no Instagram é entre 5 e 10 slides.

**Posso reutilizar um carrossel para criar outro?**
Sim. É possível duplicar um criativo existente e editá-lo para criar uma variação do conteúdo.

**O Social Attack publica diretamente no Instagram?**
Não na versão atual. O Social Attack gera e organiza o conteúdo, mas a publicação é feita manualmente pelo usuário. A publicação direta via API está prevista para versões futuras.

**Posso importar conteúdo que já tenho?**
Sim. O usuário pode criar ideias manualmente, adicionar referências como texto livre e construir criativos com base em conteúdo já existente. Importação em massa está planejada para versões futuras.

**Como funcionam as hashtags geradas?**
A IA gera um conjunto de hashtags relevantes com base no tema e no conteúdo do carrossel. O usuário pode editar, remover ou adicionar hashtags antes de exportar.

**Posso usar o conteúdo gerado comercialmente?**
Sim. Todo conteúdo gerado na plataforma é de propriedade do usuário e pode ser usado comercialmente sem restrições.

---

### Sobre as imagens geradas

**Qual é a resolução das imagens geradas?**
As imagens são geradas na proporção 4:5 (equivalente a 1080×1350px), o padrão ideal para carrosséis no Instagram.

**Posso escolher o estilo visual das imagens?**
Sim. Durante o briefing, o usuário pode descrever o estilo visual desejado (fotorrealista, ilustração, minimalista, etc.) e a IA tenta respeitar essa diretriz.

**As imagens são salvas em algum lugar?**
Sim. Todas as imagens geradas são armazenadas no Supabase Storage e ficam disponíveis para download a qualquer momento dentro da plataforma.

**Posso usar minhas próprias fotos nos slides?**
O upload de imagens próprias está disponível como referência visual para a geração. A substituição de slides gerados por imagens próprias está planejada para versões futuras.

**A IA pode gerar rostos ou pessoas reais?**
A geração de imagens segue os termos de uso do Gemini/Imagen do Google. Imagens de pessoas identificáveis ou figuras públicas reais não são geradas.

---

### Sobre conta e dados

**Como faço para criar uma conta?**
Acesse o site do Social Attack e clique em "Começar grátis". Preencha nome, e-mail e senha. Você receberá um e-mail de confirmação.

**Como faço para redefinir minha senha?**
Na tela de login, clique em "Esqueci minha senha". Insira seu e-mail e siga as instruções enviadas para a caixa de entrada.

**Meus dados são seguros?**
Sim. O Social Attack utiliza Supabase, que conta com criptografia em repouso e em trânsito, conformidade com LGPD e infraestrutura da AWS. Nenhum dado do usuário é compartilhado com terceiros sem consentimento.

**Posso exportar meus dados?**
Sim. O usuário pode fazer download de todos os criativos gerados. Uma exportação completa dos dados da conta está em desenvolvimento.

**O que acontece se eu cancelar o plano?**
O acesso volta para o plano gratuito. Os dados e criativos criados são mantidos, mas o usuário perde acesso às funcionalidades premium até uma nova assinatura.

---

### Sobre suporte

**Qual é o horário de atendimento?**
O atendimento humano está disponível:
- Segunda a sexta: das 9h às 18h (horário de Brasília)
- Sábado: das 9h às 13h (horário de Brasília)
- Domingo e feriados: sem atendimento humano

Fora desses horários, nosso agente de IA continua disponível 24h para responder dúvidas gerais.

**Como posso entrar em contato com o suporte?**
- WhatsApp: via este canal de atendimento
- E-mail: suporte@socialattack.com.br

**Quanto tempo leva para receber uma resposta?**
Em horário comercial, o tempo médio de resposta humana é de até 4 horas. Nos planos Pro e Agência, o SLA é de 2 horas.

**Há documentação ou tutoriais disponíveis?**
Sim. A Central de Ajuda está disponível em help.socialattack.com.br com tutoriais em vídeo e artigos passo a passo para cada módulo.

---

### Problemas comuns

**A IA não está gerando o conteúdo que espero. O que faço?**
O resultado da IA depende diretamente da qualidade do briefing. Tente ser mais específico: descreva melhor o público-alvo, o tom desejado e o objetivo do post. Você também pode regenerar o conteúdo quantas vezes quiser.

**As imagens não estão sendo geradas. O que pode ser?**
Verifique se seu plano inclui geração de imagens (disponível a partir do Plano Pro). Se o plano for adequado, tente atualizar a página e tentar novamente. Se o problema persistir, entre em contato com o suporte.

**A plataforma está lenta. O que faço?**
Tente limpar o cache do navegador e acessar novamente. Se o problema persistir, acesse nossa página de status em status.socialattack.com.br para verificar se há alguma instabilidade em andamento.

**Perdi um criativo que havia criado. Como recupero?**
Todos os criativos são salvos automaticamente na plataforma. Acesse o módulo "Criativos" e use os filtros de status para localizar o criativo desejado. Se ainda assim não encontrar, entre em contato com o suporte.

**Meu login não está funcionando. O que faço?**
Verifique se está usando o e-mail correto. Tente redefinir a senha pelo link "Esqueci minha senha" na tela de login. Se o problema persistir, entre em contato com o suporte informando seu e-mail cadastrado.

---

## PARTE 6 — FORA DO ESCOPO (V1)

As funcionalidades abaixo **não estão disponíveis** na versão atual e não devem ser prometidas:

- Publicação direta nas redes sociais via API
- Análise de métricas de posts publicados
- Colaboração em tempo real entre múltiplos usuários
- Integração com Canva ou outras ferramentas de design
- Aplicativo mobile nativo
- Automação de stories e reels completos
- Integração com agendadores externos (Buffer, Later, etc.)

---

*Social Attack — Base de Conhecimento v1.0 | Maio 2026*
