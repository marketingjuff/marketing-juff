CREATE OR REPLACE FUNCTION public.pode_estruturar_quadro(_quadro_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role('admin')
    OR (public.has_role('gestor') AND public.can_edit('tarefas.quadros') AND public.pode_ver_quadro(_quadro_id))
$$;

CREATE OR REPLACE FUNCTION public.pode_mexer_card(_card_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tarefa_cards c
     WHERE c.id = _card_id
       AND public.pode_ver_quadro(c.quadro_id)
       AND public.can_edit('tarefas.quadros')
       AND (public.has_role('admin') OR public.has_role('gestor')
            OR c.responsavel_id = auth.uid() OR c.criado_por = auth.uid())
  )
$$;

DROP POLICY IF EXISTS "colunas_insert" ON public.tarefa_colunas;
DROP POLICY IF EXISTS "colunas_update" ON public.tarefa_colunas;
CREATE POLICY "colunas_insert" ON public.tarefa_colunas FOR INSERT TO authenticated
  WITH CHECK (public.pode_estruturar_quadro(quadro_id));
CREATE POLICY "colunas_update" ON public.tarefa_colunas FOR UPDATE TO authenticated
  USING (public.pode_estruturar_quadro(quadro_id));

DROP POLICY IF EXISTS "cards_update" ON public.tarefa_cards;
CREATE POLICY "cards_update" ON public.tarefa_cards FOR UPDATE TO authenticated
  USING (public.pode_mexer_card(id));

DROP POLICY IF EXISTS "card_etiquetas_insert" ON public.tarefa_card_etiquetas;
DROP POLICY IF EXISTS "card_etiquetas_delete" ON public.tarefa_card_etiquetas;
CREATE POLICY "card_etiquetas_insert" ON public.tarefa_card_etiquetas FOR INSERT TO authenticated
  WITH CHECK (public.pode_mexer_card(card_id));
CREATE POLICY "card_etiquetas_delete" ON public.tarefa_card_etiquetas FOR DELETE TO authenticated
  USING (public.pode_mexer_card(card_id));

DROP POLICY IF EXISTS "checklist_insert" ON public.tarefa_checklist;
DROP POLICY IF EXISTS "checklist_update" ON public.tarefa_checklist;
DROP POLICY IF EXISTS "checklist_delete" ON public.tarefa_checklist;
CREATE POLICY "checklist_insert" ON public.tarefa_checklist FOR INSERT TO authenticated
  WITH CHECK (public.pode_mexer_card(card_id));
CREATE POLICY "checklist_update" ON public.tarefa_checklist FOR UPDATE TO authenticated
  USING (public.pode_mexer_card(card_id));
CREATE POLICY "checklist_delete" ON public.tarefa_checklist FOR DELETE TO authenticated
  USING (public.pode_mexer_card(card_id));

DROP POLICY IF EXISTS "anexos_insert" ON public.tarefa_anexos;
DROP POLICY IF EXISTS "anexos_delete" ON public.tarefa_anexos;
CREATE POLICY "anexos_insert" ON public.tarefa_anexos FOR INSERT TO authenticated
  WITH CHECK (public.pode_mexer_card(card_id));
CREATE POLICY "anexos_delete" ON public.tarefa_anexos FOR DELETE TO authenticated
  USING (public.pode_mexer_card(card_id));