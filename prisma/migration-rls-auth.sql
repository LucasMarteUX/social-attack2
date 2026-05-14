-- RLS: apenas usuários autenticados acessam todas as tabelas
-- Execute no SQL Editor do Supabase Dashboard

-- Tabelas do domínio principal
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideias ENABLE ROW LEVEL SECURITY;
ALTER TABLE criativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tons_de_voz ENABLE ROW LEVEL SECURITY;

-- Tabelas de nodes/workspace
ALTER TABLE design_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE slide_edit_history ENABLE ROW LEVEL SECURITY;

-- Policies: acesso total apenas para sessão autenticada

CREATE POLICY "auth_only" ON categorias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON ideias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON criativos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON agendamentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON todos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON tons_de_voz FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON design_systems FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON carousels FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON carousel_slides FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_only" ON slide_edit_history FOR ALL USING (auth.role() = 'authenticated');
