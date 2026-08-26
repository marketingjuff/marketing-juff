CREATE TABLE public.story_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  instrucao text NOT NULL DEFAULT '',
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_objectives TO authenticated;
GRANT ALL ON public.story_objectives TO service_role;

ALTER TABLE public.story_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objectives_select" ON public.story_objectives
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "objectives_insert" ON public.story_objectives
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));

CREATE POLICY "objectives_update" ON public.story_objectives
  FOR UPDATE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'))
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));

CREATE POLICY "objectives_delete" ON public.story_objectives
  FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'));

CREATE OR REPLACE FUNCTION public.story_objectives_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER story_objectives_updated_at
  BEFORE UPDATE ON public.story_objectives
  FOR EACH ROW EXECUTE FUNCTION public.story_objectives_touch();