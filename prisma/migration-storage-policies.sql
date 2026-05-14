-- Políticas RLS em storage.objects para uploads via anon key (cliente Vite).
-- Sem políticas, INSERT em storage.objects falha mesmo com bucket público.
-- Já aplicado no projeto remoto via Supabase MCP; reproduza em outros ambientes se necessário.

CREATE POLICY "carousel_images_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'carousel-images');

CREATE POLICY "carousel_images_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "carousel_images_update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'carousel-images')
WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "carousel_images_delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'carousel-images');

CREATE POLICY "design_system_refs_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'design-system-references');

CREATE POLICY "design_system_refs_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'design-system-references');

CREATE POLICY "design_system_refs_update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'design-system-references')
WITH CHECK (bucket_id = 'design-system-references');

CREATE POLICY "design_system_refs_delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'design-system-references');

-- Remove limite de MIME no carousel-images (ex.: HEIC do iPhone falhava).
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'carousel-images';
