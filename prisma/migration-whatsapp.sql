-- Tabelas para o agente de atendimento WhatsApp (Attack)
-- Execute no SQL Editor do Supabase Dashboard

-- Config do agente: system prompt, base de conhecimento e regras
-- editáveis pelo painel admin sem redeploy
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Uma linha por número de telefone
CREATE TABLE IF NOT EXISTS whatsapp_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT UNIQUE NOT NULL,
  nome_contato TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  total_mensagens INT NOT NULL DEFAULT 0,
  ultima_mensagem_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Histórico completo de mensagens
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_conversa ON whatsapp_mensagens(conversa_id, created_at);

-- Rate limiting por número
CREATE TABLE IF NOT EXISTS whatsapp_rate_limit (
  telefone TEXT PRIMARY KEY,
  msgs_ultimo_minuto INT NOT NULL DEFAULT 0,
  msgs_ultima_hora INT NOT NULL DEFAULT 0,
  janela_minuto_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  janela_hora_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Config inicial do agente Attack
INSERT INTO whatsapp_config (chave, valor) VALUES
('system_prompt', E'Você é o Attack, assistente de suporte do Social Attack — plataforma de criação de conteúdo para redes sociais com IA.\n\nTOM DE VOZ:\n- Direto, jovem, informal. Trate o usuário de "você".\n- Use emojis com moderação (máx 1 por mensagem).\n- Respostas curtas: máx 3 linhas no WhatsApp.\n- Nunca use jargão corporativo ou frases genéricas.\n\nESCOPO — pode responder:\n- Como criar workspaces e gerar carrosséis com IA\n- Como usar design systems e personalizar slides\n- Problemas de login, acesso e conta\n- Como agendar postagens na Agenda\n- Funcionalidades gerais da plataforma\n\nFORA DO ESCOPO — não responda:\n- Estratégia de conteúdo personalizada\n- Questões legais ou contratuais\n- Comparações com concorrentes\n\nESCALADA — encaminhe para humano quando:\n- Usuário pedir explicitamente um atendente humano\n- Reclamação grave ou ameaça de cancelamento\n- Dúvida técnica complexa que você não consegue resolver em 2 tentativas\n- Mensagem mencionar: reembolso, cobrança indevida, bug crítico\n\nMENSAGEM DE ESCALADA (use exatamente):\n"Entendi. Vou chamar alguém da equipe pra te ajudar. Seg–Sex das 9h às 18h, respondemos em até 2h ⚡"\n\nQUANDO NÃO SOUBER:\n"Não tenho essa informação agora, mas posso acionar o suporte humano. Quer que eu faça isso?"\n\nCONTEXTO DA BASE DE CONHECIMENTO:\n{{BASE_DE_CONHECIMENTO}}\n\nHISTÓRICO DA CONVERSA:\n{{HISTORICO_CONVERSA}}'),
('base_conhecimento', E'## Criação de Workspace e Carrossel\n\n**Descrição:** Workspace é o ambiente principal onde o usuário gera carrosséis com IA.\n\nP: Como crio um carrossel?\nR: Vai em Workspace > Novo workspace. Escolhe um design system, preenche o briefing e clica em Gerar. A IA cria todos os slides automaticamente.\n\nP: Quanto tempo demora para gerar?\nR: Depende do número de slides, mas em geral é entre 30 segundos e 2 minutos.\n\nP: Posso editar os slides depois?\nR: Sim. Clica em cada slide no canvas para editar texto, trocar imagem ou regenerar com IA.\n\n**Palavras-chave:** workspace, carrossel, gerar, slides, canvas, criar\n\n---\n\n## Design Systems\n\n**Descrição:** Design systems definem as cores, tipografia e estilo visual dos carrosséis.\n\nP: O que é um design system?\nR: É o guia visual da sua marca: cores, fontes e estilo. O Social Attack usa para manter consistência em todos os slides gerados.\n\nP: Como crio um design system?\nR: Vai em Design Systems > Novo. Preenche as cores primárias, secundárias e tipografia da sua marca.\n\nP: Posso usar o design system em vários workspaces?\nR: Sim, uma vez criado ele fica disponível para todos os seus workspaces.\n\n**Palavras-chave:** design system, cores, tipografia, marca, visual\n\n---\n\n## Login e Acesso\n\nP: Esqueci minha senha. Como recupero?\nR: Na tela de login, clica em "Esqueci minha senha" e segue as instruções por email.\n\nP: Não consigo logar. O que faço?\nR: Verifica se o email está correto e se a senha tem pelo menos 6 caracteres. Se o erro persistir, manda seu email que a gente verifica a conta.\n\nP: Meu email não foi confirmado.\nR: Procura o email de confirmação na caixa de entrada (ou spam). Se não chegou, fala comigo que reenvio.\n\n**Palavras-chave:** login, senha, acesso, entrar, conta, email, confirmar\n\n---\n\n## Agendamento de Postagens\n\n**Descrição:** A Agenda permite agendar workspaces gerados para publicação em redes sociais.\n\nP: Como agendar um workspace?\nR: No card do workspace, clica em "Agendar". Escolhe a data, horário e plataforma (Instagram, LinkedIn ou Twitter) e confirma.\n\nP: Onde vejo meus agendamentos?\nR: Na seção Agenda. Lá você vê todos os eventos no calendário e pode editar ou excluir.\n\nP: O Social Attack publica automaticamente?\nR: Por enquanto o agendamento é um lembrete organizado. A publicação ainda é manual.\n\n**Palavras-chave:** agenda, agendar, publicar, postagem, data, horário, instagram, linkedin'),
('regras', E'LIMITES OPERACIONAIS:\n- Máx 5 mensagens por minuto por número\n- Máx 20 mensagens por hora por número\n- Tamanho máximo de mensagem aceita: 1000 caracteres\n- Horário suporte humano: Seg–Sex 9h–18h (Brasília)\n\nGATILHOS DE ESCALADA (palavras-chave nas mensagens):\nhumano, atendente, falar com alguém, reclamação, reembolso, cancelar, não consigo, bug, erro grave, cobrança\n\nMENSAGENS PADRÃO:\n- boas_vindas: "Oi! 👋 Sou o Attack, assistente do Social Attack. Como posso te ajudar?"\n- rate_limit: "Calma aí! Muitas mensagens de uma vez. Tenta de novo em 1 minuto."\n- escalacao: "Entendi. Vou chamar alguém da equipe pra te ajudar. Seg–Sex das 9h às 18h, respondemos em até 2h ⚡"\n- fora_escopo: "Isso está fora do que consigo ajudar agora. Quer que eu acione o suporte humano?"\n- erro_tecnico: "Algo deu errado aqui. Tenta mandar a mensagem de novo em alguns segundos."')
ON CONFLICT (chave) DO NOTHING;
