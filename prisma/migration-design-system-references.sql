-- Rodar no SQL Editor do Supabase se as colunas ainda não existirem.
ALTER TABLE design_systems
  ADD COLUMN IF NOT EXISTS reference_image_urls TEXT[] DEFAULT '{}';

ALTER TABLE carousel_slides
  ADD COLUMN IF NOT EXISTS image_is_full_composition BOOLEAN DEFAULT false;
