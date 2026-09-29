create table if not exists public.tarefa_quadro_atalhos (
  user_id uuid not null references auth.users(id) on delete cascade,
  quadro_id uuid not null references public.tarefa_quadros(id) on delete cascade,
  aberturas integer not null default 0,
  ultimo_acesso timestamptz not null default now(),
  fixado boolean not null default false,
  primary key (user_id, quadro_id)
);
comment on table public.tarefa_quadro_atalhos is 'Uso de cada quadro por pessoa, alimenta a barra de atalhos do cabecalho.';
create index if not exists tarefa_quadro_atalhos_ordem_idx
  on public.tarefa_quadro_atalhos (user_id, fixado desc, aberturas desc, ultimo_acesso desc);
grant select, insert, update, delete on public.tarefa_quadro_atalhos to authenticated;
grant all on public.tarefa_quadro_atalhos to service_role;
alter table public.tarefa_quadro_atalhos enable row level security;
drop policy if exists "atalhos_select_proprio" on public.tarefa_quadro_atalhos;
create policy "atalhos_select_proprio" on public.tarefa_quadro_atalhos
  for select to authenticated
  using (user_id = auth.uid() and public.has_permission('tarefas.quadros'));
drop policy if exists "atalhos_insert_proprio" on public.tarefa_quadro_atalhos;
create policy "atalhos_insert_proprio" on public.tarefa_quadro_atalhos
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_permission('tarefas.quadros'));
drop policy if exists "atalhos_update_proprio" on public.tarefa_quadro_atalhos;
create policy "atalhos_update_proprio" on public.tarefa_quadro_atalhos
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "atalhos_delete_proprio" on public.tarefa_quadro_atalhos;
create policy "atalhos_delete_proprio" on public.tarefa_quadro_atalhos
  for delete to authenticated
  using (user_id = auth.uid());
create or replace function public.registrar_abertura_quadro(p_quadro_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  if not public.has_permission('tarefas.quadros') then return; end if;
  if not public.pode_ver_quadro(p_quadro_id) then return; end if;
  if not exists (select 1 from public.tarefa_quadros q where q.id = p_quadro_id and q.arquivado = false) then return; end if;
  insert into public.tarefa_quadro_atalhos as a (user_id, quadro_id, aberturas, ultimo_acesso)
  values (auth.uid(), p_quadro_id, 1, now())
  on conflict (user_id, quadro_id) do update
    set aberturas = a.aberturas + 1, ultimo_acesso = now();
end $$;
revoke all on function public.registrar_abertura_quadro(uuid) from public, anon;
grant execute on function public.registrar_abertura_quadro(uuid) to authenticated, service_role;