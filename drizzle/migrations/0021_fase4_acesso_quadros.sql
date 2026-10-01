alter table public.tarefa_quadros add column if not exists acesso text not null default 'aberto';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='tarefa_quadros_acesso_check') then
    alter table public.tarefa_quadros add constraint tarefa_quadros_acesso_check check (acesso in ('aberto','restrito'));
  end if;
end $$;

create table if not exists public.app_marcos (chave text primary key, aplicado_em timestamptz not null default now());
grant select on public.app_marcos to authenticated;
grant all on public.app_marcos to service_role;
alter table public.app_marcos enable row level security;
drop policy if exists "marcos leitura admin" on public.app_marcos;
create policy "marcos leitura admin" on public.app_marcos for select to authenticated using (public.has_role('admin'));

do $$ begin
  if not exists (select 1 from public.app_marcos where chave='fase4_acesso_quadros') then
    update public.tarefa_quadros q set acesso='restrito'
     where exists (select 1 from public.tarefa_quadro_membros m where m.quadro_id=q.id);
    insert into public.app_marcos (chave) values ('fase4_acesso_quadros');
  end if;
end $$;

create or replace function public.pode_ver_quadro(_quadro_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('admin')
    or (public.has_permission('tarefas.quadros') and (
      exists (select 1 from public.tarefa_quadros q where q.id=_quadro_id and q.acesso='aberto')
      or exists (select 1 from public.tarefa_quadro_membros m where m.quadro_id=_quadro_id and m.user_id=auth.uid())))
$$;

create or replace function public.pode_editar_card(_card_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.pode_ver_card(_card_id) and (
    SELECT EXISTS (SELECT 1 FROM public.tarefa_cards c WHERE c.id = _card_id AND public.pode_editar_quadro(c.quadro_id)))
$$;

drop policy if exists "membros leitura admin" on public.tarefa_quadro_membros;
create policy "membros leitura admin" on public.tarefa_quadro_membros for select to authenticated using (public.has_role('admin'));
create index if not exists tarefa_quadro_membros_user_idx on public.tarefa_quadro_membros (user_id);

create or replace function public.tarefa_set_quadros_do_usuario(_user_id uuid, _quadro_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('admin') then raise exception 'Só admin altera os quadros de uma pessoa'; end if;
  delete from public.tarefa_quadro_membros where user_id=_user_id and quadro_id <> all (coalesce(_quadro_ids,'{}'::uuid[]));
  insert into public.tarefa_quadro_membros (quadro_id, user_id)
  select unnest(coalesce(_quadro_ids,'{}'::uuid[])), _user_id on conflict do nothing;
end; $$;
grant execute on function public.tarefa_set_quadros_do_usuario(uuid, uuid[]) to authenticated;