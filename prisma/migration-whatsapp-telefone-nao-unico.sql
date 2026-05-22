-- Várias conversas por mesmo WhatsApp (nova sessão com IA depois de encerrar).
-- Rode uma vez no SQL Editor do Supabase.
--
-- Motivo: a linha inicial do migration-whatsapp criava UNIQUE(telefone), o que
-- impede INSERT de segunda conversa quando o cliente manda novo WhatsApp após
-- encerramento — o webhook ficava sem conversa válida até este ajuste.
--
-- Nota: o nome exato da constraint pode variar. Se DROP falhar:
-- SELECT con.conname FROM pg_constraint con JOIN pg_class rel ON ... WHERE rel.relname='whatsapp_conversas';

ALTER TABLE whatsapp_conversas DROP CONSTRAINT IF EXISTS whatsapp_conversas_telefone_key;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_telefone_ultima
  ON whatsapp_conversas (telefone, ultima_mensagem_at DESC NULLS LAST);
