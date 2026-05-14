-- ============================================================
-- Migration: Arquitetura de Nodes para Carrosséis
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. design_systems
CREATE TABLE IF NOT EXISTS design_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  cover_tag_font_size INTEGER DEFAULT 12,
  cover_tag_color VARCHAR(20) DEFAULT '#6D28D9',
  cover_headline_font_size INTEGER DEFAULT 32,
  cover_headline_weight VARCHAR(20) DEFAULT 'bold',
  cover_headline_font_family VARCHAR(50) DEFAULT 'Inter',
  cover_subheadline_font_size INTEGER DEFAULT 14,
  cover_subheadline_color VARCHAR(20) DEFAULT '#666666',

  body_headline_font_size INTEGER DEFAULT 24,
  body_headline_weight VARCHAR(20) DEFAULT 'bold',
  body_paragraph_font_size INTEGER DEFAULT 16,
  body_paragraph_color VARCHAR(20) DEFAULT '#333333',

  cta_message_font_size INTEGER DEFAULT 28,
  cta_message_weight VARCHAR(20) DEFAULT 'bold',
  cta_background_color VARCHAR(20) DEFAULT '#6D28D9',
  cta_text_color VARCHAR(20) DEFAULT '#FFFFFF',

  global_background_color VARCHAR(20) DEFAULT '#FFFFFF',
  global_accent_color VARCHAR(20) DEFAULT '#6D28D9',
  global_font_family VARCHAR(50) DEFAULT 'Inter',

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
  tone_of_voice_id UUID REFERENCES tons_de_voz(id) ON DELETE SET NULL,
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
