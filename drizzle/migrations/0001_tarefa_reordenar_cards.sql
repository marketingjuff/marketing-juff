CREATE OR REPLACE FUNCTION public.tarefa_reordenar_cards(_coluna_id uuid, _ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.tarefa_cards c
  SET posicao = t.ord - 1,
      coluna_id = _coluna_id
  FROM unnest(_ids) WITH ORDINALITY AS t(id, ord)
  WHERE c.id = t.id;
$$;

GRANT EXECUTE ON FUNCTION public.tarefa_reordenar_cards(uuid, uuid[]) TO authenticated;