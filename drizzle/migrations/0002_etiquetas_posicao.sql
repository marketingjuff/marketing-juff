ALTER TABLE public.tarefa_etiquetas ADD COLUMN posicao integer NOT NULL DEFAULT 0;

WITH ordenado AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY lower(nome), id) AS nova_posicao
  FROM public.tarefa_etiquetas
)
UPDATE public.tarefa_etiquetas e
SET posicao = o.nova_posicao
FROM ordenado o
WHERE e.id = o.id;

CREATE OR REPLACE FUNCTION public.tarefa_reordenar_etiquetas(_ids uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  FOR i IN 1..array_length(_ids, 1) LOOP
    UPDATE public.tarefa_etiquetas SET posicao = i WHERE id = _ids[i];
  END LOOP;
END;
$$;