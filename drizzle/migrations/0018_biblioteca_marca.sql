CREATE TABLE IF NOT EXISTS public.biblioteca_paleta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  hex text NOT NULL,
  rascunho boolean NOT NULL DEFAULT false,
  posicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_paleta_nome_key ON public.biblioteca_paleta (nome);
CREATE TABLE IF NOT EXISTS public.biblioteca_textos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo text NOT NULL,
  titulo text,
  texto text NOT NULL,
  observacao text,
  posicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_textos_unico ON public.biblioteca_textos (grupo, texto);
CREATE INDEX IF NOT EXISTS biblioteca_textos_grupo_idx ON public.biblioteca_textos (grupo, posicao);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_paleta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_textos TO authenticated;
GRANT ALL ON public.biblioteca_paleta TO service_role;
GRANT ALL ON public.biblioteca_textos TO service_role;
ALTER TABLE public.biblioteca_paleta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_textos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "biblioteca_paleta_select" ON public.biblioteca_paleta;
CREATE POLICY "biblioteca_paleta_select" ON public.biblioteca_paleta FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "biblioteca_paleta_insert" ON public.biblioteca_paleta;
CREATE POLICY "biblioteca_paleta_insert" ON public.biblioteca_paleta FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_paleta_update" ON public.biblioteca_paleta;
CREATE POLICY "biblioteca_paleta_update" ON public.biblioteca_paleta FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_paleta_delete" ON public.biblioteca_paleta;
CREATE POLICY "biblioteca_paleta_delete" ON public.biblioteca_paleta FOR DELETE TO authenticated USING (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_textos_select" ON public.biblioteca_textos;
CREATE POLICY "biblioteca_textos_select" ON public.biblioteca_textos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "biblioteca_textos_insert" ON public.biblioteca_textos;
CREATE POLICY "biblioteca_textos_insert" ON public.biblioteca_textos FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_textos_update" ON public.biblioteca_textos;
CREATE POLICY "biblioteca_textos_update" ON public.biblioteca_textos FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_textos_delete" ON public.biblioteca_textos;
CREATE POLICY "biblioteca_textos_delete" ON public.biblioteca_textos FOR DELETE TO authenticated USING (public.has_role('admin'));
DROP TRIGGER IF EXISTS biblioteca_paleta_updated_at ON public.biblioteca_paleta;
CREATE TRIGGER biblioteca_paleta_updated_at BEFORE UPDATE ON public.biblioteca_paleta FOR EACH ROW EXECUTE FUNCTION public.biblioteca_touch();
DROP TRIGGER IF EXISTS biblioteca_textos_updated_at ON public.biblioteca_textos;
CREATE TRIGGER biblioteca_textos_updated_at BEFORE UPDATE ON public.biblioteca_textos FOR EACH ROW EXECUTE FUNCTION public.biblioteca_touch();