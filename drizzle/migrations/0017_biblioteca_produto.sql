CREATE TABLE IF NOT EXISTS public.biblioteca_cores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  nome_olist text NOT NULL,
  hex text NOT NULL,
  posicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_cores_nome_olist_key ON public.biblioteca_cores (nome_olist);

CREATE TABLE IF NOT EXISTS public.biblioteca_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_base text NOT NULL,
  tecido text NOT NULL DEFAULT 'ThermoAir',
  usa_tecido boolean NOT NULL DEFAULT true,
  sufixo text NOT NULL DEFAULT '',
  usa_sufixo boolean NOT NULL DEFAULT false,
  usa_xtra boolean NOT NULL DEFAULT true,
  tamanhos_xtra text[] NOT NULL DEFAULT ARRAY['EXG','EXXG']::text[],
  tamanhos text[] NOT NULL DEFAULT '{}'::text[],
  pontos text[] NOT NULL DEFAULT '{}'::text[],
  posicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_produtos_nome_key ON public.biblioteca_produtos (nome_base, sufixo);

CREATE TABLE IF NOT EXISTS public.biblioteca_produto_cores (
  produto_id uuid NOT NULL REFERENCES public.biblioteca_produtos(id) ON DELETE CASCADE,
  cor_id uuid NOT NULL REFERENCES public.biblioteca_cores(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'Normal',
  PRIMARY KEY (produto_id, cor_id)
);
CREATE INDEX IF NOT EXISTS biblioteca_produto_cores_produto_idx ON public.biblioteca_produto_cores (produto_id);

CREATE TABLE IF NOT EXISTS public.biblioteca_medidas (
  produto_id uuid NOT NULL REFERENCES public.biblioteca_produtos(id) ON DELETE CASCADE,
  ponto text NOT NULL,
  tamanho text NOT NULL,
  minimo numeric(5,1),
  alvo numeric(5,1),
  maximo numeric(5,1),
  PRIMARY KEY (produto_id, ponto, tamanho)
);
CREATE INDEX IF NOT EXISTS biblioteca_medidas_produto_idx ON public.biblioteca_medidas (produto_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_cores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_produto_cores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_medidas TO authenticated;
GRANT ALL ON public.biblioteca_cores TO service_role;
GRANT ALL ON public.biblioteca_produtos TO service_role;
GRANT ALL ON public.biblioteca_produto_cores TO service_role;
GRANT ALL ON public.biblioteca_medidas TO service_role;

ALTER TABLE public.biblioteca_cores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_produto_cores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_medidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biblioteca_cores_select" ON public.biblioteca_cores;
CREATE POLICY "biblioteca_cores_select" ON public.biblioteca_cores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "biblioteca_cores_insert" ON public.biblioteca_cores;
CREATE POLICY "biblioteca_cores_insert" ON public.biblioteca_cores FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_cores_update" ON public.biblioteca_cores;
CREATE POLICY "biblioteca_cores_update" ON public.biblioteca_cores FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_cores_delete" ON public.biblioteca_cores;
CREATE POLICY "biblioteca_cores_delete" ON public.biblioteca_cores FOR DELETE TO authenticated USING (public.has_role('admin'));

DROP POLICY IF EXISTS "biblioteca_produtos_select" ON public.biblioteca_produtos;
CREATE POLICY "biblioteca_produtos_select" ON public.biblioteca_produtos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "biblioteca_produtos_insert" ON public.biblioteca_produtos;
CREATE POLICY "biblioteca_produtos_insert" ON public.biblioteca_produtos FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_produtos_update" ON public.biblioteca_produtos;
CREATE POLICY "biblioteca_produtos_update" ON public.biblioteca_produtos FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_produtos_delete" ON public.biblioteca_produtos;
CREATE POLICY "biblioteca_produtos_delete" ON public.biblioteca_produtos FOR DELETE TO authenticated USING (public.has_role('admin'));

DROP POLICY IF EXISTS "biblioteca_produto_cores_select" ON public.biblioteca_produto_cores;
CREATE POLICY "biblioteca_produto_cores_select" ON public.biblioteca_produto_cores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "biblioteca_produto_cores_insert" ON public.biblioteca_produto_cores;
CREATE POLICY "biblioteca_produto_cores_insert" ON public.biblioteca_produto_cores FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_produto_cores_update" ON public.biblioteca_produto_cores;
CREATE POLICY "biblioteca_produto_cores_update" ON public.biblioteca_produto_cores FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_produto_cores_delete" ON public.biblioteca_produto_cores;
CREATE POLICY "biblioteca_produto_cores_delete" ON public.biblioteca_produto_cores FOR DELETE TO authenticated USING (public.has_role('admin'));

DROP POLICY IF EXISTS "biblioteca_medidas_select" ON public.biblioteca_medidas;
CREATE POLICY "biblioteca_medidas_select" ON public.biblioteca_medidas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "biblioteca_medidas_insert" ON public.biblioteca_medidas;
CREATE POLICY "biblioteca_medidas_insert" ON public.biblioteca_medidas FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_medidas_update" ON public.biblioteca_medidas;
CREATE POLICY "biblioteca_medidas_update" ON public.biblioteca_medidas FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP POLICY IF EXISTS "biblioteca_medidas_delete" ON public.biblioteca_medidas;
CREATE POLICY "biblioteca_medidas_delete" ON public.biblioteca_medidas FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE OR REPLACE FUNCTION public.biblioteca_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS biblioteca_cores_updated_at ON public.biblioteca_cores;
CREATE TRIGGER biblioteca_cores_updated_at BEFORE UPDATE ON public.biblioteca_cores FOR EACH ROW EXECUTE FUNCTION public.biblioteca_touch();
DROP TRIGGER IF EXISTS biblioteca_produtos_updated_at ON public.biblioteca_produtos;
CREATE TRIGGER biblioteca_produtos_updated_at BEFORE UPDATE ON public.biblioteca_produtos FOR EACH ROW EXECUTE FUNCTION public.biblioteca_touch();

CREATE OR REPLACE FUNCTION public.biblioteca_salvar_cores(p_produto_id uuid, p_cores jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  DELETE FROM public.biblioteca_produto_cores pc
  WHERE pc.produto_id = p_produto_id
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_cores) AS e WHERE (e ->> 'cor_id')::uuid = pc.cor_id);
  INSERT INTO public.biblioteca_produto_cores (produto_id, cor_id, categoria)
  SELECT p_produto_id, (e ->> 'cor_id')::uuid, COALESCE(e ->> 'categoria', 'Normal')
  FROM jsonb_array_elements(p_cores) AS e
  ON CONFLICT (produto_id, cor_id) DO UPDATE SET categoria = EXCLUDED.categoria;
END;
$$;
GRANT EXECUTE ON FUNCTION public.biblioteca_salvar_cores(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.biblioteca_salvar_medidas(p_produto_id uuid, p_medidas jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  INSERT INTO public.biblioteca_medidas (produto_id, ponto, tamanho, minimo, alvo, maximo)
  SELECT p_produto_id, e ->> 'ponto', e ->> 'tamanho',
    NULLIF(e ->> 'minimo', '')::numeric, NULLIF(e ->> 'alvo', '')::numeric, NULLIF(e ->> 'maximo', '')::numeric
  FROM jsonb_array_elements(p_medidas) AS e
  ON CONFLICT (produto_id, ponto, tamanho)
  DO UPDATE SET minimo = EXCLUDED.minimo, alvo = EXCLUDED.alvo, maximo = EXCLUDED.maximo;
END;
$$;
GRANT EXECUTE ON FUNCTION public.biblioteca_salvar_medidas(uuid, jsonb) TO authenticated;