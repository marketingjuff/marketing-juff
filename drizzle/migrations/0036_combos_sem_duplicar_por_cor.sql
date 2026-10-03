DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.biblioteca_combo_registrar(text,uuid,jsonb)'::regprocedure);
  d := replace(d, 'and cb.cor_id is not distinct from p_cor_id', '');
  EXECUTE d;
  d := pg_get_functiondef('public.biblioteca_carga_fichas(jsonb)'::regprocedure);
  d := replace(d, 'and cb.cor_id is not distinct from v_cor_id', '');
  EXECUTE d;
END
$do$;