CREATE TABLE IF NOT EXISTS public.biblioteca_arquivo_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  posicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_arquivo_grupos_nome_key ON public.biblioteca_arquivo_grupos (nome);

CREATE TABLE IF NOT EXISTS public.biblioteca_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.biblioteca_arquivo_grupos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  formato text NOT NULL,
  variacao text NOT NULL DEFAULT '',
  caminho text NOT NULL,
  tamanho_bytes bigint NOT NULL DEFAULT 0,
  posicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS biblioteca_arquivos_grupo_idx ON public.biblioteca_arquivos (grupo_id, posicao);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_arquivos_caminho_key ON public.biblioteca_arquivos (caminho);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_arquivo_grupos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_arquivos TO authenticated;
GRANT ALL ON public.biblioteca_arquivo_grupos TO service_role;
GRANT ALL ON public.biblioteca_arquivos TO service_role;

ALTER TABLE public.biblioteca_arquivo_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_arquivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biblioteca_arquivo_grupos_select" ON public.biblioteca_arquivo_grupos;
CREATE POLICY "biblioteca_arquivo_grupos_select" ON public.biblioteca_arquivo_grupos FOR SELECT TO authenticated USING (public.has_permission('biblioteca.arquivos'));
DROP POLICY IF EXISTS "biblioteca_arquivo_grupos_insert" ON public.biblioteca_arquivo_grupos;
CREATE POLICY "biblioteca_arquivo_grupos_insert" ON public.biblioteca_arquivo_grupos FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_arquivo_grupos_update" ON public.biblioteca_arquivo_grupos;
CREATE POLICY "biblioteca_arquivo_grupos_update" ON public.biblioteca_arquivo_grupos FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_arquivo_grupos_delete" ON public.biblioteca_arquivo_grupos;
CREATE POLICY "biblioteca_arquivo_grupos_delete" ON public.biblioteca_arquivo_grupos FOR DELETE TO authenticated USING (public.has_role('admin'));

DROP POLICY IF EXISTS "biblioteca_arquivos_select" ON public.biblioteca_arquivos;
CREATE POLICY "biblioteca_arquivos_select" ON public.biblioteca_arquivos FOR SELECT TO authenticated USING (public.has_permission('biblioteca.arquivos'));
DROP POLICY IF EXISTS "biblioteca_arquivos_insert" ON public.biblioteca_arquivos;
CREATE POLICY "biblioteca_arquivos_insert" ON public.biblioteca_arquivos FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_arquivos_update" ON public.biblioteca_arquivos;
CREATE POLICY "biblioteca_arquivos_update" ON public.biblioteca_arquivos FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_arquivos_delete" ON public.biblioteca_arquivos;
CREATE POLICY "biblioteca_arquivos_delete" ON public.biblioteca_arquivos FOR DELETE TO authenticated USING (public.has_role('admin'));

DROP POLICY IF EXISTS "marca bucket leitura" ON storage.objects;
CREATE POLICY "marca bucket leitura" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'marca' AND public.has_permission('biblioteca.arquivos'));
DROP POLICY IF EXISTS "marca bucket envio" ON storage.objects;
CREATE POLICY "marca bucket envio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'marca' AND public.has_role('admin'));
DROP POLICY IF EXISTS "marca bucket atualizacao" ON storage.objects;
CREATE POLICY "marca bucket atualizacao" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'marca' AND public.has_role('admin'));
DROP POLICY IF EXISTS "marca bucket remocao" ON storage.objects;
CREATE POLICY "marca bucket remocao" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'marca' AND public.has_role('admin'));

DROP TRIGGER IF EXISTS biblioteca_arquivo_grupos_updated_at ON public.biblioteca_arquivo_grupos;
CREATE TRIGGER biblioteca_arquivo_grupos_updated_at BEFORE UPDATE ON public.biblioteca_arquivo_grupos FOR EACH ROW EXECUTE FUNCTION public.biblioteca_touch();