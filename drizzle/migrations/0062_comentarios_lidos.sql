ALTER TABLE public.tarefa_quadros ADD COLUMN IF NOT EXISTS comentarios_lidos boolean NOT NULL DEFAULT false;
ALTER TABLE public.tarefa_comentarios ADD COLUMN IF NOT EXISTS lido_em timestamptz;
ALTER TABLE public.tarefa_comentarios ADD COLUMN IF NOT EXISTS lido_por uuid;

CREATE OR REPLACE FUNCTION public.tarefa_comentarios_marcar_lidos(_card_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_resp uuid; v_n integer;
BEGIN
  SELECT responsavel_id INTO v_resp FROM tarefa_cards WHERE id = _card_id;
  IF NOT public.pode_ver_card(_card_id) OR (v_resp IS DISTINCT FROM auth.uid() AND NOT public.has_role('admin')) THEN
    RAISE EXCEPTION 'Só o responsável pode dar os comentários como lidos';
  END IF;
  UPDATE tarefa_comentarios SET lido_em = now(), lido_por = auth.uid()
   WHERE card_id = _card_id AND lido_em IS NULL AND autor_id IS DISTINCT FROM v_resp;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.tarefa_comentarios_marcar_lidos(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tarefa_comentarios_marcar_lidos(uuid) TO authenticated;