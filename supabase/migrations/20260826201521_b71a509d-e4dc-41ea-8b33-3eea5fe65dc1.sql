ALTER TABLE public.story_frames
  ADD COLUMN IF NOT EXISTS comp_texto_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comp_texto_conteudo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS comp_texto_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS comp_texto_y numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS comp_texto_fonte text NOT NULL DEFAULT 'Nunito',
  ADD COLUMN IF NOT EXISTS comp_texto_peso integer NOT NULL DEFAULT 900,
  ADD COLUMN IF NOT EXISTS comp_texto_tamanho integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS comp_texto_cor text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS comp_sombra_cor text NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS comp_sombra_opacidade integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS comp_logo_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comp_logo_id uuid,
  ADD COLUMN IF NOT EXISTS comp_logo_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS comp_logo_y numeric NOT NULL DEFAULT 85,
  ADD COLUMN IF NOT EXISTS comp_logo_tamanho integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS comp_logo_cor text NOT NULL DEFAULT '#ffffff';

CREATE TABLE IF NOT EXISTS public.story_text_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  fonte text NOT NULL DEFAULT 'Nunito',
  peso integer NOT NULL DEFAULT 700,
  tamanho integer NOT NULL DEFAULT 6,
  cor_texto text NOT NULL DEFAULT '#ffffff',
  cor_sombra text NOT NULL DEFAULT '#000000',
  opacidade_sombra integer NOT NULL DEFAULT 50,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_text_presets TO authenticated;
GRANT ALL ON public.story_text_presets TO service_role;
ALTER TABLE public.story_text_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presets leitura autenticada" ON public.story_text_presets;
CREATE POLICY "presets leitura autenticada" ON public.story_text_presets
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "presets insert gestao" ON public.story_text_presets;
CREATE POLICY "presets insert gestao" ON public.story_text_presets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));
DROP POLICY IF EXISTS "presets update gestao" ON public.story_text_presets;
CREATE POLICY "presets update gestao" ON public.story_text_presets
  FOR UPDATE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'))
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));
DROP POLICY IF EXISTS "presets delete gestao" ON public.story_text_presets;
CREATE POLICY "presets delete gestao" ON public.story_text_presets
  FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'));

CREATE TABLE IF NOT EXISTS public.story_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  file_path text NOT NULL,
  proporcao numeric NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_logos TO authenticated;
GRANT ALL ON public.story_logos TO service_role;
ALTER TABLE public.story_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logos leitura autenticada" ON public.story_logos;
CREATE POLICY "logos leitura autenticada" ON public.story_logos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "logos insert gestao" ON public.story_logos;
CREATE POLICY "logos insert gestao" ON public.story_logos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));
DROP POLICY IF EXISTS "logos update gestao" ON public.story_logos;
CREATE POLICY "logos update gestao" ON public.story_logos
  FOR UPDATE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'))
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));
DROP POLICY IF EXISTS "logos delete gestao" ON public.story_logos;
CREATE POLICY "logos delete gestao" ON public.story_logos
  FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'));

INSERT INTO public.story_text_presets (nome, fonte, peso, tamanho, cor_texto, cor_sombra, opacidade_sombra)
SELECT v.nome, v.fonte, v.peso, v.tamanho, v.cor_texto, v.cor_sombra, v.opacidade_sombra
FROM (VALUES
  ('Título forte', 'Nunito', 900, 8, '#ffffff', '#000000', 60),
  ('Destaque', 'Google Sans Flex', 700, 6, '#ffffff', '#000000', 35),
  ('Legenda leve', 'Nunito', 400, 4, '#ffffff', '#000000', 0),
  ('Promo amarela', 'Nunito', 900, 7, '#ffe938', '#000000', 50),
  ('Institucional', 'Google Sans Flex', 400, 3, '#ffffff', '#000000', 15)
) AS v(nome, fonte, peso, tamanho, cor_texto, cor_sombra, opacidade_sombra)
WHERE NOT EXISTS (SELECT 1 FROM public.story_text_presets p WHERE p.nome = v.nome);

DROP POLICY IF EXISTS "logos bucket leitura" ON storage.objects;
CREATE POLICY "logos bucket leitura" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'logos');
DROP POLICY IF EXISTS "logos bucket envio" ON storage.objects;
CREATE POLICY "logos bucket envio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (public.has_role('admin') OR public.has_role('gestor')));
DROP POLICY IF EXISTS "logos bucket remocao" ON storage.objects;
CREATE POLICY "logos bucket remocao" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (public.has_role('admin') OR public.has_role('gestor')));