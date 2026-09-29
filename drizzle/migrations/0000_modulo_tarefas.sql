CREATE TABLE public.tarefa_quadros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'Novo quadro',
  descricao text NOT NULL DEFAULT '',
  fundo_tipo text NOT NULL DEFAULT 'solida' CHECK (fundo_tipo IN ('solida','degrade')),
  fundo_cor1 text NOT NULL DEFAULT '#185fa5' CHECK (fundo_cor1 ~ '^#[0-9a-fA-F]{6}$'),
  fundo_cor2 text NOT NULL DEFAULT '#0c447c' CHECK (fundo_cor2 ~ '^#[0-9a-fA-F]{6}$'),
  posicao integer NOT NULL DEFAULT 0,
  arquivado boolean NOT NULL DEFAULT false,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tarefa_quadro_membros (
  quadro_id uuid NOT NULL REFERENCES public.tarefa_quadros(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quadro_id, user_id)
);
CREATE TABLE public.tarefa_colunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro_id uuid NOT NULL REFERENCES public.tarefa_quadros(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT 'Nova coluna',
  posicao integer NOT NULL DEFAULT 0,
  conclui boolean NOT NULL DEFAULT false,
  limite_wip integer,
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tarefa_etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#888780' CHECK (cor ~ '^#[0-9a-fA-F]{6}$'),
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tarefa_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro_id uuid NOT NULL REFERENCES public.tarefa_quadros(id) ON DELETE CASCADE,
  coluna_id uuid NOT NULL REFERENCES public.tarefa_colunas(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_inicio date,
  data_entrega date,
  prioridade text CHECK (prioridade IN ('baixa','media','alta','maxima')),
  esforco text CHECK (esforco IN ('rapido','meio_dia','varios_dias')),
  adiado_ate date,
  depende_de text NOT NULL DEFAULT '',
  link_externo text NOT NULL DEFAULT '',
  posicao integer NOT NULL DEFAULT 0,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  coluna_desde timestamptz NOT NULL DEFAULT now(),
  arquivado boolean NOT NULL DEFAULT false,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tarefa_cards_quadro_idx ON public.tarefa_cards (quadro_id, coluna_id, posicao);
CREATE INDEX tarefa_cards_responsavel_idx ON public.tarefa_cards (responsavel_id) WHERE arquivado = false;
CREATE INDEX tarefa_cards_entrega_idx ON public.tarefa_cards (data_entrega) WHERE arquivado = false;
CREATE TABLE public.tarefa_card_etiquetas (
  card_id uuid NOT NULL REFERENCES public.tarefa_cards(id) ON DELETE CASCADE,
  etiqueta_id uuid NOT NULL REFERENCES public.tarefa_etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, etiqueta_id)
);
CREATE TABLE public.tarefa_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.tarefa_cards(id) ON DELETE CASCADE,
  texto text NOT NULL DEFAULT '',
  feito boolean NOT NULL DEFAULT false,
  posicao integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tarefa_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.tarefa_cards(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  texto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tarefa_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.tarefa_cards(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  path text NOT NULL,
  tamanho bigint NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT '',
  enviado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tarefa_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.tarefa_cards(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  acao text NOT NULL,
  detalhe text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tarefa_historico_card_idx ON public.tarefa_historico (card_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.pode_ver_quadro(_quadro_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role('admin')
    OR (public.has_permission('tarefas.quadros')
      AND (NOT EXISTS (SELECT 1 FROM public.tarefa_quadro_membros m WHERE m.quadro_id = _quadro_id)
        OR EXISTS (SELECT 1 FROM public.tarefa_quadro_membros m WHERE m.quadro_id = _quadro_id AND m.user_id = auth.uid())))
$$;
CREATE OR REPLACE FUNCTION public.pode_editar_quadro(_quadro_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role('admin')
    OR (public.can_edit('tarefas.quadros') AND public.pode_ver_quadro(_quadro_id))
$$;
CREATE OR REPLACE FUNCTION public.pode_ver_card(_card_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tarefa_cards c WHERE c.id = _card_id AND public.pode_ver_quadro(c.quadro_id))
$$;
CREATE OR REPLACE FUNCTION public.pode_editar_card(_card_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tarefa_cards c WHERE c.id = _card_id AND public.pode_editar_quadro(c.quadro_id))
$$;

CREATE OR REPLACE FUNCTION public.trg_tarefa_card_touch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.coluna_id IS DISTINCT FROM OLD.coluna_id THEN NEW.coluna_desde := now(); END IF;
  IF NEW.concluido AND NOT OLD.concluido THEN NEW.concluido_em := now();
  ELSIF NOT NEW.concluido AND OLD.concluido THEN NEW.concluido_em := NULL; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER tarefa_card_touch BEFORE UPDATE ON public.tarefa_cards
FOR EACH ROW EXECUTE FUNCTION public.trg_tarefa_card_touch();

CREATE OR REPLACE FUNCTION public.trg_tarefa_card_coluna_conclui()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conclui boolean;
BEGIN
  SELECT conclui INTO v_conclui FROM public.tarefa_colunas WHERE id = NEW.coluna_id;
  IF v_conclui IS TRUE THEN
    NEW.concluido := true;
    IF NEW.concluido_em IS NULL THEN NEW.concluido_em := now(); END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.coluna_id IS DISTINCT FROM OLD.coluna_id THEN
    NEW.concluido := false;
    NEW.concluido_em := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER tarefa_card_coluna_conclui BEFORE INSERT OR UPDATE ON public.tarefa_cards
FOR EACH ROW EXECUTE FUNCTION public.trg_tarefa_card_coluna_conclui();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefa_quadros, public.tarefa_quadro_membros, public.tarefa_colunas, public.tarefa_etiquetas, public.tarefa_cards, public.tarefa_card_etiquetas, public.tarefa_checklist, public.tarefa_comentarios, public.tarefa_anexos, public.tarefa_historico TO authenticated;
GRANT ALL ON public.tarefa_quadros, public.tarefa_quadro_membros, public.tarefa_colunas, public.tarefa_etiquetas, public.tarefa_cards, public.tarefa_card_etiquetas, public.tarefa_checklist, public.tarefa_comentarios, public.tarefa_anexos, public.tarefa_historico TO service_role;

ALTER TABLE public.tarefa_quadros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_quadro_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_card_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quadros_select" ON public.tarefa_quadros FOR SELECT TO authenticated USING (public.pode_ver_quadro(id));
CREATE POLICY "quadros_insert" ON public.tarefa_quadros FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
CREATE POLICY "quadros_update" ON public.tarefa_quadros FOR UPDATE TO authenticated USING (public.has_role('admin'));
CREATE POLICY "quadros_delete" ON public.tarefa_quadros FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE POLICY "quadro_membros_select" ON public.tarefa_quadro_membros FOR SELECT TO authenticated USING (public.pode_ver_quadro(quadro_id));
CREATE POLICY "quadro_membros_insert" ON public.tarefa_quadro_membros FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
CREATE POLICY "quadro_membros_delete" ON public.tarefa_quadro_membros FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE POLICY "colunas_select" ON public.tarefa_colunas FOR SELECT TO authenticated USING (public.pode_ver_quadro(quadro_id));
CREATE POLICY "colunas_insert" ON public.tarefa_colunas FOR INSERT TO authenticated WITH CHECK (public.pode_editar_quadro(quadro_id));
CREATE POLICY "colunas_update" ON public.tarefa_colunas FOR UPDATE TO authenticated USING (public.pode_editar_quadro(quadro_id));
CREATE POLICY "colunas_delete" ON public.tarefa_colunas FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE POLICY "etiquetas_select" ON public.tarefa_etiquetas FOR SELECT TO authenticated USING (public.has_permission('tarefas.quadros'));
CREATE POLICY "etiquetas_insert" ON public.tarefa_etiquetas FOR INSERT TO authenticated WITH CHECK (public.can_edit('tarefas.quadros'));
CREATE POLICY "etiquetas_update" ON public.tarefa_etiquetas FOR UPDATE TO authenticated USING (public.can_edit('tarefas.quadros'));
CREATE POLICY "etiquetas_delete" ON public.tarefa_etiquetas FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE POLICY "cards_select" ON public.tarefa_cards FOR SELECT TO authenticated USING (public.pode_ver_quadro(quadro_id));
CREATE POLICY "cards_insert" ON public.tarefa_cards FOR INSERT TO authenticated WITH CHECK (public.pode_editar_quadro(quadro_id));
CREATE POLICY "cards_update" ON public.tarefa_cards FOR UPDATE TO authenticated USING (public.pode_editar_quadro(quadro_id));
CREATE POLICY "cards_delete" ON public.tarefa_cards FOR DELETE TO authenticated USING (public.has_role('admin'));

CREATE POLICY "card_etiquetas_select" ON public.tarefa_card_etiquetas FOR SELECT TO authenticated USING (public.pode_ver_card(card_id));
CREATE POLICY "card_etiquetas_insert" ON public.tarefa_card_etiquetas FOR INSERT TO authenticated WITH CHECK (public.pode_editar_card(card_id));
CREATE POLICY "card_etiquetas_delete" ON public.tarefa_card_etiquetas FOR DELETE TO authenticated USING (public.pode_editar_card(card_id));

CREATE POLICY "checklist_select" ON public.tarefa_checklist FOR SELECT TO authenticated USING (public.pode_ver_card(card_id));
CREATE POLICY "checklist_insert" ON public.tarefa_checklist FOR INSERT TO authenticated WITH CHECK (public.pode_editar_card(card_id));
CREATE POLICY "checklist_update" ON public.tarefa_checklist FOR UPDATE TO authenticated USING (public.pode_editar_card(card_id));
CREATE POLICY "checklist_delete" ON public.tarefa_checklist FOR DELETE TO authenticated USING (public.pode_editar_card(card_id));

CREATE POLICY "comentarios_select" ON public.tarefa_comentarios FOR SELECT TO authenticated USING (public.pode_ver_card(card_id));
CREATE POLICY "comentarios_insert" ON public.tarefa_comentarios FOR INSERT TO authenticated WITH CHECK (public.pode_editar_card(card_id) AND autor_id = auth.uid());
CREATE POLICY "comentarios_update" ON public.tarefa_comentarios FOR UPDATE TO authenticated USING (autor_id = auth.uid());
CREATE POLICY "comentarios_delete" ON public.tarefa_comentarios FOR DELETE TO authenticated USING (autor_id = auth.uid() OR public.has_role('admin'));

CREATE POLICY "anexos_select" ON public.tarefa_anexos FOR SELECT TO authenticated USING (public.pode_ver_card(card_id));
CREATE POLICY "anexos_insert" ON public.tarefa_anexos FOR INSERT TO authenticated WITH CHECK (public.pode_editar_card(card_id));
CREATE POLICY "anexos_delete" ON public.tarefa_anexos FOR DELETE TO authenticated USING (public.pode_editar_card(card_id));

CREATE POLICY "historico_select" ON public.tarefa_historico FOR SELECT TO authenticated USING (public.pode_ver_card(card_id));
CREATE POLICY "historico_insert" ON public.tarefa_historico FOR INSERT TO authenticated WITH CHECK (public.pode_ver_card(card_id) AND autor_id = auth.uid());

CREATE POLICY "profiles_select_tarefas" ON public.profiles FOR SELECT TO authenticated USING (public.has_permission('tarefas.quadros'));

CREATE POLICY "tarefas_bucket_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tarefas' AND public.has_permission('tarefas.quadros'));
CREATE POLICY "tarefas_bucket_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tarefas' AND public.can_edit('tarefas.quadros'));
CREATE POLICY "tarefas_bucket_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tarefas' AND public.can_edit('tarefas.quadros'));