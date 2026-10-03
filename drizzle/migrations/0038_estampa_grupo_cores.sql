create table if not exists public.biblioteca_estampa_grupo_cores (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.biblioteca_estampa_grupos(id) on delete cascade,
  cor_id uuid not null references public.biblioteca_cores(id),
  posicao int not null default 0,
  unique (grupo_id, cor_id)
);
create index if not exists idx_estampa_grupo_cores_grupo on public.biblioteca_estampa_grupo_cores(grupo_id);
grant select, insert, update, delete on public.biblioteca_estampa_grupo_cores to authenticated;
grant all on public.biblioteca_estampa_grupo_cores to service_role;
alter table public.biblioteca_estampa_grupo_cores enable row level security;
drop policy if exists biblioteca_estampa_grupo_cores_sel on public.biblioteca_estampa_grupo_cores;
create policy biblioteca_estampa_grupo_cores_sel on public.biblioteca_estampa_grupo_cores for select to authenticated using (public.has_permission('biblioteca.catalogo_estampas'));
drop policy if exists biblioteca_estampa_grupo_cores_ins on public.biblioteca_estampa_grupo_cores;
create policy biblioteca_estampa_grupo_cores_ins on public.biblioteca_estampa_grupo_cores for insert to authenticated with check (public.can_edit('biblioteca.catalogo_estampas'));
drop policy if exists biblioteca_estampa_grupo_cores_upd on public.biblioteca_estampa_grupo_cores;
create policy biblioteca_estampa_grupo_cores_upd on public.biblioteca_estampa_grupo_cores for update to authenticated using (public.can_edit('biblioteca.catalogo_estampas')) with check (public.can_edit('biblioteca.catalogo_estampas'));
drop policy if exists biblioteca_estampa_grupo_cores_del on public.biblioteca_estampa_grupo_cores;
create policy biblioteca_estampa_grupo_cores_del on public.biblioteca_estampa_grupo_cores for delete to authenticated using (public.can_edit('biblioteca.catalogo_estampas'));
do $$
begin
  if not exists (select 1 from public.app_marcos where chave = 'estampa_cores_por_grupo') then
    insert into public.biblioteca_estampa_grupo_cores (grupo_id, cor_id, posicao)
    select r.grupo_id, r.cor_id, coalesce(cc.posicao, 0)
    from (select distinct grupo_id, cor_id from public.biblioteca_estampa_receitas) r
    join public.biblioteca_estampa_grupos g on g.id = r.grupo_id
    left join public.biblioteca_estampa_cores_camiseta cc on cc.estampa_id = g.estampa_id and cc.cor_id = r.cor_id
    on conflict do nothing;
    insert into public.app_marcos (chave, aplicado_em) values ('estampa_cores_por_grupo', now());
  end if;
end $$;