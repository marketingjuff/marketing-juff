CREATE OR REPLACE FUNCTION public.biblioteca_combo_registrar(p_genero text, p_cor_id uuid, p_itens jsonb)
 RETURNS TABLE(id uuid, codigo text, criado boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_assinatura text;
  v_id uuid;
  v_codigo text;
begin
  if not public.can_edit('biblioteca.catalogo_estampas') then
    raise exception 'sem permissão';
  end if;

  select string_agg(upper(x->>'codigo'), '|' order by ord)
    into v_assinatura
    from jsonb_array_elements(p_itens) with ordinality as t(x, ord);

  select cb.id, cb.codigo into v_id, v_codigo
    from public.biblioteca_combos cb
   where cb.cor_id is not distinct from p_cor_id
     and (
     select string_agg(upper(ci.codigo), '|' order by ci.ordem)
       from public.biblioteca_combo_itens ci
      where ci.combo_id = cb.id
   ) = v_assinatura
   order by cb.posicao
   limit 1;

  if v_id is not null then
    return query select v_id, v_codigo, false;
    return;
  end if;

  v_codigo := public.biblioteca_proximo_codigo_combo();
  insert into public.biblioteca_combos as nb (codigo, genero, cor_id, posicao)
  values (v_codigo, p_genero, p_cor_id,
          coalesce((select max(b2.posicao) from public.biblioteca_combos b2), 0) + 1)
  returning nb.id into v_id;

  insert into public.biblioteca_combo_itens (combo_id, ordem, codigo, c, m, y, k)
  select v_id, t.ord, t.x->>'codigo',
         coalesce((t.x->>'c')::int, 0), coalesce((t.x->>'m')::int, 0),
         coalesce((t.x->>'y')::int, 0), coalesce((t.x->>'k')::int, 0)
    from jsonb_array_elements(p_itens) with ordinality as t(x, ord);

  return query select v_id, v_codigo, true;
end;
$function$;