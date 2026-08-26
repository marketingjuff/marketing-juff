UPDATE public.story_frames
SET texto_principal = comp_texto_conteudo
WHERE coalesce(btrim(texto_principal), '') = ''
  AND coalesce(btrim(comp_texto_conteudo), '') <> '';

ALTER TABLE public.story_frames DROP COLUMN IF EXISTS comp_texto_conteudo;
ALTER TABLE public.story_frames DROP COLUMN IF EXISTS comp_texto_ativo;
ALTER TABLE public.story_frames ADD COLUMN IF NOT EXISTS comp_texto_alinhamento text NOT NULL DEFAULT 'center';

ALTER TABLE public.story_text_presets ADD COLUMN IF NOT EXISTS alinhamento text NOT NULL DEFAULT 'center';