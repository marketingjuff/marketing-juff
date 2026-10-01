CREATE TABLE IF NOT EXISTS public.biblioteca_estampa_cores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL DEFAULT '',
  familia text NOT NULL DEFAULT 'cromatica',
  c smallint NOT NULL DEFAULT 0,
  m smallint NOT NULL DEFAULT 0,
  y smallint NOT NULL DEFAULT 0,
  k smallint NOT NULL DEFAULT 0,
  hex text NOT NULL,
  posicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_estampa_cores_codigo_key ON public.biblioteca_estampa_cores (codigo);
CREATE INDEX IF NOT EXISTS biblioteca_estampa_cores_familia_idx ON public.biblioteca_estampa_cores (familia, posicao);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_estampa_cores TO authenticated;
GRANT ALL ON public.biblioteca_estampa_cores TO service_role;
ALTER TABLE public.biblioteca_estampa_cores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "biblioteca_estampa_select" ON public.biblioteca_estampa_cores;
CREATE POLICY "biblioteca_estampa_select" ON public.biblioteca_estampa_cores FOR SELECT TO authenticated USING (public.has_permission('biblioteca.estampa'));
DROP POLICY IF EXISTS "biblioteca_estampa_insert" ON public.biblioteca_estampa_cores;
CREATE POLICY "biblioteca_estampa_insert" ON public.biblioteca_estampa_cores FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_estampa_update" ON public.biblioteca_estampa_cores;
CREATE POLICY "biblioteca_estampa_update" ON public.biblioteca_estampa_cores FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_estampa_delete" ON public.biblioteca_estampa_cores;
CREATE POLICY "biblioteca_estampa_delete" ON public.biblioteca_estampa_cores FOR DELETE TO authenticated USING (public.has_role('admin'));
DROP TRIGGER IF EXISTS biblioteca_estampa_cores_updated_at ON public.biblioteca_estampa_cores;
CREATE TRIGGER biblioteca_estampa_cores_updated_at BEFORE UPDATE ON public.biblioteca_estampa_cores FOR EACH ROW EXECUTE FUNCTION public.biblioteca_touch();