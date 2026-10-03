create or replace function public.biblioteca_estampa_apagar_receita(p_receita_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.biblioteca_estampa_receitas where id = p_receita_id;
$$;
grant execute on function public.biblioteca_estampa_apagar_receita(uuid) to authenticated;