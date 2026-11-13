create table if not exists public.social_formatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  posicao integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists social_formatos_nome_idx on public.social_formatos (upper(btrim(nome)));

create table if not exists public.social_planejados (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null default '',
  formato_id uuid references public.social_formatos(id) on delete set null,
  descricao text not null default '',
  ads boolean not null default false,
  posicao integer not null default 0,
  criado_por uuid,
  created_at timestamptz not null default now()
);
create index if not exists social_planejados_data_idx on public.social_planejados (data);

create table if not exists public.social_publicados (
  id uuid primary key default gen_random_uuid(),
  ig_id text not null,
  tipo text not null default 'post',
  formato text not null default '',
  publicado_em timestamptz not null,
  data date not null,
  legenda text not null default '',
  permalink text not null default '',
  capa_path text not null default '',
  curtidas integer not null default 0,
  comentarios integer not null default 0,
  visualizacoes integer not null default 0,
  respostas integer not null default 0,
  ads boolean not null default false,
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists social_publicados_ig_idx on public.social_publicados (ig_id);
create index if not exists social_publicados_data_idx on public.social_publicados (data, tipo);

create table if not exists public.social_instagram_estado (
  id boolean primary key default true,
  ig_user_id text not null default '',
  nome_conta text not null default '',
  ultima_leitura timestamptz,
  ultimo_erro text not null default '',
  check (id)
);
insert into public.social_instagram_estado (id) values (true) on conflict (id) do nothing;

grant select, insert, update, delete on
  public.social_formatos, public.social_planejados, public.social_publicados, public.social_instagram_estado
  to authenticated;
grant all on
  public.social_formatos, public.social_planejados, public.social_publicados, public.social_instagram_estado
  to service_role;

alter table public.social_formatos enable row level security;
alter table public.social_planejados enable row level security;
alter table public.social_publicados enable row level security;
alter table public.social_instagram_estado enable row level security;

drop policy if exists social_formatos_select on public.social_formatos;
create policy social_formatos_select on public.social_formatos
  for select to authenticated using (public.e_colaborador());
drop policy if exists social_formatos_write on public.social_formatos;
create policy social_formatos_write on public.social_formatos for all to authenticated
  using (public.has_role('admin') or public.has_role('gestor'))
  with check (public.has_role('admin') or public.has_role('gestor'));

drop policy if exists social_planejados_select on public.social_planejados;
create policy social_planejados_select on public.social_planejados
  for select to authenticated using (public.has_permission('estrategia.calendario_social'));
drop policy if exists social_planejados_write on public.social_planejados;
create policy social_planejados_write on public.social_planejados for all to authenticated
  using (public.can_edit('estrategia.calendario_social'))
  with check (public.can_edit('estrategia.calendario_social'));

drop policy if exists social_publicados_select on public.social_publicados;
create policy social_publicados_select on public.social_publicados
  for select to authenticated using (public.has_permission('estrategia.calendario_social'));
drop policy if exists social_publicados_update on public.social_publicados;
create policy social_publicados_update on public.social_publicados for update to authenticated
  using (public.can_edit('estrategia.calendario_social'))
  with check (public.can_edit('estrategia.calendario_social'));

drop policy if exists social_ig_estado_select on public.social_instagram_estado;
create policy social_ig_estado_select on public.social_instagram_estado
  for select to authenticated using (public.has_permission('estrategia.calendario_social'));
drop policy if exists social_ig_estado_write on public.social_instagram_estado;
create policy social_ig_estado_write on public.social_instagram_estado for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

insert into public.social_formatos (nome, posicao)
select v.nome, v.posicao from (values
  ('Feed', 1), ('Carrossel', 2), ('Reels', 3), ('Story', 4), ('Colaboração', 5)
) as v(nome, posicao)
where not exists (
  select 1 from public.social_formatos f where upper(btrim(f.nome)) = upper(btrim(v.nome))
);

create or replace function public.social_formatos_reordenar(_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role('admin') or public.has_role('gestor')) then
    raise exception 'sem permissao';
  end if;
  update public.social_formatos t set posicao = x.ord
    from unnest(_ids) with ordinality x(id, ord) where t.id = x.id;
end; $$;
revoke execute on function public.social_formatos_reordenar(uuid[]) from anon, public;
grant execute on function public.social_formatos_reordenar(uuid[]) to authenticated;

drop policy if exists social_bucket_select on storage.objects;
create policy social_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'social' and public.has_permission('estrategia.calendario_social'));

insert into public.app_segredos (chave, valor)
select 'social_sync_chave', encode(extensions.gen_random_bytes(24), 'hex')
where not exists (select 1 from public.app_segredos where chave = 'social_sync_chave');

-- Chave usada pelo botão "Testar e ler agora": devolvida só para admin.
create or replace function public.social_sync_chave_admin()
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('admin') then raise exception 'sem permissao'; end if;
  return (select valor from public.app_segredos where chave = 'social_sync_chave');
end; $$;
revoke execute on function public.social_sync_chave_admin() from anon, public;
grant execute on function public.social_sync_chave_admin() to authenticated;