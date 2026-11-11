ALTER POLICY biblioteca_produtos_update ON public.biblioteca_produtos USING (public.can_edit('biblioteca.produtos')) WITH CHECK (public.can_edit('biblioteca.produtos'));
ALTER POLICY biblioteca_produtos_insert ON public.biblioteca_produtos WITH CHECK (public.can_edit('biblioteca.produtos'));
ALTER POLICY biblioteca_produto_cores_insert ON public.biblioteca_produto_cores WITH CHECK (public.can_edit('biblioteca.produtos'));
ALTER POLICY biblioteca_produto_cores_update ON public.biblioteca_produto_cores USING (public.can_edit('biblioteca.produtos')) WITH CHECK (public.can_edit('biblioteca.produtos'));
ALTER POLICY biblioteca_produto_cores_delete ON public.biblioteca_produto_cores USING (public.can_edit('biblioteca.produtos'));
CREATE OR REPLACE FUNCTION public.biblioteca_salvar_cores(p_produto_id uuid, p_cores jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_edit('biblioteca.produtos') THEN
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
REVOKE EXECUTE ON FUNCTION public.biblioteca_salvar_cores(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.biblioteca_salvar_cores(uuid, jsonb) TO authenticated, service_role;