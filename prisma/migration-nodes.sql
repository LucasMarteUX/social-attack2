-- ============================================================
-- Migration: Arquitetura de Nodes para Carrosséis
-- Rodar no Supabase SQL Editor (caso precise recriar do zero)
-- ============================================================

-- 1. design_systems
CREATE TABLE IF NOT EXISTS design_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  markdown TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  reference_image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. carousels
CREATE TABLE IF NOT EXISTS carousels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  references_urls TEXT[] DEFAULT '{}',
  references_text TEXT,
  total_slides INTEGER DEFAULT 5,
  design_system_id UUID REFERENCES design_systems(id) ON DELETE SET NULL,
  tone_of_voice_id TEXT REFERENCES tons_de_voz(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  parent_carousel_id UUID REFERENCES carousels(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. carousel_slides
CREATE TABLE IF NOT EXISTS carousel_slides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carousel_id UUID REFERENCES carousels(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  slide_type VARCHAR(20) NOT NULL,

  tag_text VARCHAR(100),
  headline TEXT,
  subheadline TEXT,
  body_paragraph TEXT,
  cta_message TEXT,

  original_tag_text VARCHAR(100),
  original_headline TEXT,
  original_subheadline TEXT,
  original_body_paragraph TEXT,
  original_cta_message TEXT,

  image_url TEXT,
  image_source VARCHAR(20) DEFAULT 'none',
  image_generation_prompt TEXT,
  image_is_full_composition BOOLEAN DEFAULT false,

  is_text_edited BOOLEAN DEFAULT false,
  is_image_edited BOOLEAN DEFAULT false,
  regenerate_text_count INTEGER DEFAULT 0,
  regenerate_image_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(carousel_id, slide_number)
);

-- 4. slide_edit_history
CREATE TABLE IF NOT EXISTS slide_edit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slide_id UUID REFERENCES carousel_slides(id) ON DELETE CASCADE,
  action_type VARCHAR(30) NOT NULL,
  field_changed VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  prompt_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Função e triggers de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_design_systems
  BEFORE UPDATE ON design_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_carousels
  BEFORE UPDATE ON carousels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_carousel_slides
  BEFORE UPDATE ON carousel_slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
