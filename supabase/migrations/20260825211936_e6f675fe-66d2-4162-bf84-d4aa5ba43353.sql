ALTER TABLE public.story_frames
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS adjust_comment text,
  ADD COLUMN IF NOT EXISTS adjust_comment_at timestamptz,
  ADD COLUMN IF NOT EXISTS image_path_anterior text,
  ADD COLUMN IF NOT EXISTS trocado_em timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_frames_status_check'
  ) THEN
    ALTER TABLE public.story_frames
      ADD CONSTRAINT story_frames_status_check
      CHECK (status IN ('pendente','ajustar','refeito','aprovado'));
  END IF;
END $$;

-- Migração dos dados existentes
UPDATE public.story_frames f
SET status = 'aprovado'
FROM public.stories s
WHERE s.id = f.story_id AND s.status = 'aprovado';

UPDATE public.story_frames f
SET status = 'ajustar',
    adjust_comment = s.adjust_comment,
    adjust_comment_at = s.adjust_comment_at
FROM public.stories s
WHERE s.id = f.story_id AND s.status = 'ajustar';

CREATE OR REPLACE FUNCTION public.recalc_story_status(_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  em_ajuste int;
  aprovadas int;
  novo text;
  comentario text;
  comentario_at timestamptz;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE status = 'ajustar'),
         count(*) FILTER (WHERE status = 'aprovado')
    INTO total, em_ajuste, aprovadas
  FROM public.story_frames WHERE story_id = _story_id;

  IF total = 0 THEN
    novo := 'pendente';
  ELSIF em_ajuste > 0 THEN
    novo := 'ajustar';
  ELSIF aprovadas = total THEN
    novo := 'aprovado';
  ELSE
    novo := 'pendente';
  END IF;

  SELECT adjust_comment, adjust_comment_at INTO comentario, comentario_at
  FROM public.story_frames
  WHERE story_id = _story_id AND status = 'ajustar'
  ORDER BY ordem ASC LIMIT 1;

  UPDATE public.stories
  SET status = novo,
      adjust_comment = comentario,
      adjust_comment_at = comentario_at
  WHERE id = _story_id;
END $$;

CREATE OR REPLACE FUNCTION public.story_frames_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_story_status(OLD.story_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_story_status(NEW.story_id);
  IF TG_OP = 'UPDATE' AND NEW.story_id IS DISTINCT FROM OLD.story_id THEN
    PERFORM public.recalc_story_status(OLD.story_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_story_frames_sync_status ON public.story_frames;
CREATE TRIGGER trg_story_frames_sync_status
AFTER INSERT OR UPDATE OR DELETE ON public.story_frames
FOR EACH ROW EXECUTE FUNCTION public.story_frames_sync_status();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.stories LOOP
    PERFORM public.recalc_story_status(r.id);
  END LOOP;
END $$;