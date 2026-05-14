-- Adiciona suporte a agendamentos de carrosséis (workspaces)
-- Execute no SQL Editor do Supabase Dashboard

ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS carousel_id UUID REFERENCES carousels(id) ON DELETE SET NULL;

ALTER TABLE agendamentos
  ALTER COLUMN criativo_id DROP NOT NULL;
