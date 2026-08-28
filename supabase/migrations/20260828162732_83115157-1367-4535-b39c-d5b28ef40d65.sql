ALTER TABLE public.story_frames
  ADD COLUMN IF NOT EXISTS cta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_link text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.story_ctas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL,
  grupo text NOT NULL DEFAULT 'Juff Store',
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_ctas TO authenticated;
GRANT ALL ON public.story_ctas TO service_role;

ALTER TABLE public.story_ctas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ctas_select" ON public.story_ctas;
CREATE POLICY "ctas_select" ON public.story_ctas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ctas_insert" ON public.story_ctas;
CREATE POLICY "ctas_insert" ON public.story_ctas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));

DROP POLICY IF EXISTS "ctas_update" ON public.story_ctas;
CREATE POLICY "ctas_update" ON public.story_ctas
  FOR UPDATE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'))
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));

DROP POLICY IF EXISTS "ctas_delete" ON public.story_ctas;
CREATE POLICY "ctas_delete" ON public.story_ctas
  FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'));

CREATE OR REPLACE FUNCTION public.story_ctas_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS story_ctas_updated_at ON public.story_ctas;
CREATE TRIGGER story_ctas_updated_at
  BEFORE UPDATE ON public.story_ctas
  FOR EACH ROW EXECUTE FUNCTION public.story_ctas_touch();

CREATE TABLE IF NOT EXISTS public.story_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  url text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_links TO authenticated;
GRANT ALL ON public.story_links TO service_role;

ALTER TABLE public.story_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_links_select" ON public.story_links;
CREATE POLICY "story_links_select" ON public.story_links
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "story_links_insert" ON public.story_links;
CREATE POLICY "story_links_insert" ON public.story_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));

DROP POLICY IF EXISTS "story_links_update" ON public.story_links;
CREATE POLICY "story_links_update" ON public.story_links
  FOR UPDATE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'))
  WITH CHECK (public.has_role('admin') OR public.has_role('gestor'));

DROP POLICY IF EXISTS "story_links_delete" ON public.story_links;
CREATE POLICY "story_links_delete" ON public.story_links
  FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('gestor'));

CREATE OR REPLACE FUNCTION public.story_links_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS story_links_updated_at ON public.story_links;
CREATE TRIGGER story_links_updated_at
  BEFORE UPDATE ON public.story_links
  FOR EACH ROW EXECUTE FUNCTION public.story_links_touch();

INSERT INTO public.story_ctas (texto, grupo)
SELECT v.texto, v.grupo
FROM (VALUES
  ('Veja a coleção.', 'Juff Store'),
  ('Escolha a sua cor.', 'Juff Store'),
  ('Tenha a sua.', 'Juff Store'),
  ('Sua nova favorita.', 'Juff Store'),
  ('Quero minha Juff.', 'Juff Store'),
  ('Compre a sua.', 'Juff Store'),
  ('Essa merece o click.', 'Juff Store'),
  ('Boa de repetir.', 'Juff Store'),
  ('Sua rotina pede.', 'Juff Store'),
  ('Vai com você.', 'Juff Store'),
  ('Fale com nossa equipe', 'Juff Custom'),
  ('Personalize agora', 'Juff Custom'),
  ('Fale com nosso time', 'Juff Custom'),
  ('Chame a gente', 'Juff Custom')
) AS v(texto, grupo)
WHERE NOT EXISTS (SELECT 1 FROM public.story_ctas c WHERE c.texto = v.texto);

INSERT INTO public.story_links (nome, url, descricao)
SELECT v.nome, v.url, v.descricao
FROM (VALUES
  ('Loja Juff Store', 'https://loja.juff.com.br', 'Venda direta ao consumidor final. Use quando o story fala de coleção, cor, modelo pronto, tecido, novidade ou compra imediata.'),
  ('Site Juff atacado', 'https://juff.com.br', 'Atacado e revenda. Use quando o story fala de lojista, revenda, pedido em quantidade ou parceria comercial.'),
  ('WhatsApp da equipe', 'https://wa.me/551139612696', 'Atendimento por conversa. Use quando o story fala de personalização, Juff Custom, uniforme, time, orçamento ou qualquer assunto que precise de atendimento humano.')
) AS v(nome, url, descricao)
WHERE NOT EXISTS (SELECT 1 FROM public.story_links l WHERE l.url = v.url);