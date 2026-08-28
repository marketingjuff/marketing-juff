ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS publicado_em timestamptz,
  ADD COLUMN IF NOT EXISTS publicado_por uuid;

CREATE INDEX IF NOT EXISTS stories_publicado_em_idx
  ON public.stories (publicado_em);

CREATE OR REPLACE FUNCTION public.stories_limpa_publicado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alvo uuid;
  anterior uuid;
BEGIN
  alvo := CASE WHEN TG_OP = 'DELETE' THEN OLD.story_id ELSE NEW.story_id END;
  anterior := CASE WHEN TG_OP = 'UPDATE' THEN OLD.story_id ELSE NULL END;

  IF alvo IS NOT NULL THEN
    UPDATE public.stories s
    SET publicado_em = NULL, publicado_por = NULL
    WHERE s.id = alvo
      AND s.publicado_em IS NOT NULL
      AND (
        NOT EXISTS (SELECT 1 FROM public.story_frames f WHERE f.story_id = alvo)
        OR EXISTS (
          SELECT 1 FROM public.story_frames f
          WHERE f.story_id = alvo AND f.status <> 'aprovado'
        )
      );
  END IF;

  IF anterior IS NOT NULL AND anterior IS DISTINCT FROM alvo THEN
    UPDATE public.stories s
    SET publicado_em = NULL, publicado_por = NULL
    WHERE s.id = anterior
      AND s.publicado_em IS NOT NULL
      AND (
        NOT EXISTS (SELECT 1 FROM public.story_frames f WHERE f.story_id = anterior)
        OR EXISTS (
          SELECT 1 FROM public.story_frames f
          WHERE f.story_id = anterior AND f.status <> 'aprovado'
        )
      );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

REVOKE ALL ON FUNCTION public.stories_limpa_publicado() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_stories_limpa_publicado ON public.story_frames;
CREATE TRIGGER trg_stories_limpa_publicado
AFTER INSERT OR UPDATE OR DELETE ON public.story_frames
FOR EACH ROW EXECUTE FUNCTION public.stories_limpa_publicado();

DROP POLICY IF EXISTS "logos insert gestao" ON public.story_logos;
CREATE POLICY "logos insert gestao" ON public.story_logos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit('social.stories'));

DROP POLICY IF EXISTS "logos bucket envio" ON storage.objects;
CREATE POLICY "logos bucket envio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND public.can_edit('social.stories'));

UPDATE public.story_frames
SET comp_logo_tamanho = GREATEST(
  0,
  LEAST(
    20,
    ROUND((0.008::numeric * comp_logo_tamanho - 0.02::numeric) / 0.011::numeric)::int
  )
)
WHERE comp_logo_tamanho IS NOT NULL;

ALTER TABLE public.story_frames
  ALTER COLUMN comp_logo_tamanho SET DEFAULT 1;