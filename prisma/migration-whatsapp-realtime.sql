-- Realtime: histórico de mensagens aparece ao vivo sem depender só do polling.
-- Executar uma vez no SQL Editor do Supabase.
-- Se retornar "already exists" / "duplicate", a publicação já inclui esta tabela.

ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_mensagens;
