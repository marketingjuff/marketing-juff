create or replace function public.e_colaborador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role in ('admin'::app_role, 'gestor'::app_role)
           or coalesce(array_length(p.permissions, 1), 0) > 0)
  )
$$;

grant execute on function public.e_colaborador() to authenticated;

drop policy if exists "feriados_todos_leem" on public.feriados;
create policy "feriados_todos_leem" on public.feriados
  for select to authenticated
  using (public.e_colaborador());

drop policy if exists "biblioteca_paleta_select" on public.biblioteca_paleta;
create policy "biblioteca_paleta_select" on public.biblioteca_paleta
  for select to authenticated
  using (public.e_colaborador());