create table if not exists public.estrategia_campos (
  id uuid primary key default gen_random_uuid(),
  frente text not null check (frente in ('store','custom')),
  label text not null default '',
  icone text not null default 'notebook-pen',
  posicao integer not null default 0,
  ativo boolean not null default true,
  no_panorama boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.estrategia_atas (
  id uuid primary key default gen_random_uuid(),
  frente text not null check (frente in ('store','custom')),
  ano integer not null,
  mes integer not null check (mes between 1 and 12),
  anotacoes text not null default '',
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (frente, ano, mes)
);
create table if not exists public.estrategia_valores (
  id uuid primary key default gen_random_uuid(),
  ata_id uuid not null references public.estrategia_atas(id) on delete cascade,
  campo_id uuid not null references public.estrategia_campos(id) on delete cascade,
  valor text not null default '',
  updated_at timestamptz not null default now(),
  unique (ata_id, campo_id)
);
create table if not exists public.estrategia_decisoes (
  id uuid primary key default gen_random_uuid(),
  ata_id uuid not null references public.estrategia_atas(id) on delete cascade,
  texto text not null default '',
  responsavel_id uuid references public.profiles(id) on delete set null,
  prazo date,
  card_id uuid references public.tarefa_cards(id) on delete set null,
  posicao integer not null default 0,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_estrategia_atas_periodo on public.estrategia_atas (frente, ano, mes);
create index if not exists idx_estrategia_valores_ata on public.estrategia_valores (ata_id);
create index if not exists idx_estrategia_decisoes_ata on public.estrategia_decisoes (ata_id, posicao);
create index if not exists idx_estrategia_campos_frente on public.estrategia_campos (frente, posicao);

grant select, insert, update, delete on public.estrategia_campos, public.estrategia_atas, public.estrategia_valores, public.estrategia_decisoes to authenticated;
grant all on public.estrategia_campos, public.estrategia_atas, public.estrategia_valores, public.estrategia_decisoes to service_role;

alter table public.estrategia_campos enable row level security;
alter table public.estrategia_atas enable row level security;
alter table public.estrategia_valores enable row level security;
alter table public.estrategia_decisoes enable row level security;

create or replace function public.pode_escrever_estrategia()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.can_edit('estrategia.ata')
     and (public.has_role('admin') or public.has_role('gestor'));
$$;

create policy "estrategia_campos_select" on public.estrategia_campos for select to authenticated using (public.has_permission('estrategia.ata'));
create policy "estrategia_campos_write" on public.estrategia_campos for all to authenticated using (public.pode_escrever_estrategia()) with check (public.pode_escrever_estrategia());
create policy "estrategia_atas_select" on public.estrategia_atas for select to authenticated using (public.has_permission('estrategia.ata'));
create policy "estrategia_atas_write" on public.estrategia_atas for all to authenticated using (public.pode_escrever_estrategia()) with check (public.pode_escrever_estrategia());
create policy "estrategia_valores_select" on public.estrategia_valores for select to authenticated using (public.has_permission('estrategia.ata'));
create policy "estrategia_valores_write" on public.estrategia_valores for all to authenticated using (public.pode_escrever_estrategia()) with check (public.pode_escrever_estrategia());
create policy "estrategia_decisoes_select" on public.estrategia_decisoes for select to authenticated using (public.has_permission('estrategia.ata'));
create policy "estrategia_decisoes_write" on public.estrategia_decisoes for all to authenticated using (public.pode_escrever_estrategia()) with check (public.pode_escrever_estrategia());

create or replace function public.estrategia_ata_id(_frente text, _ano integer, _mes integer)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not public.pode_escrever_estrategia() then raise exception 'sem permissao'; end if;
  select id into v_id from public.estrategia_atas where frente = _frente and ano = _ano and mes = _mes;
  if v_id is null then
    insert into public.estrategia_atas (frente, ano, mes, criado_por)
    values (_frente, _ano, _mes, auth.uid())
    on conflict (frente, ano, mes) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.estrategia_atas where frente = _frente and ano = _ano and mes = _mes;
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.estrategia_gravar_valor(_frente text, _ano integer, _mes integer, _campo_id uuid, _valor text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_ata uuid;
begin
  v_ata := public.estrategia_ata_id(_frente, _ano, _mes);
  insert into public.estrategia_valores (ata_id, campo_id, valor)
  values (v_ata, _campo_id, coalesce(_valor, ''))
  on conflict (ata_id, campo_id) do update set valor = excluded.valor, updated_at = now();
  update public.estrategia_atas set updated_at = now() where id = v_ata;
  return v_ata;
end;
$$;

create or replace function public.estrategia_gravar_anotacoes(_frente text, _ano integer, _mes integer, _texto text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_ata uuid;
begin
  v_ata := public.estrategia_ata_id(_frente, _ano, _mes);
  update public.estrategia_atas set anotacoes = coalesce(_texto, ''), updated_at = now() where id = v_ata;
  return v_ata;
end;
$$;

create or replace function public.estrategia_reordenar_campos(_frente text, _ids uuid[])
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.pode_escrever_estrategia() then raise exception 'sem permissao'; end if;
  update public.estrategia_campos c
     set posicao = t.ord
    from (select unnest(_ids) as id, generate_subscripts(_ids, 1) as ord) t
   where c.id = t.id and c.frente = _frente;
end;
$$;

insert into public.estrategia_campos (frente, label, icone, posicao, ativo, no_panorama)
select f.frente, c.label, c.icone, c.posicao, true, true
from (values ('store'), ('custom')) as f(frente)
cross join (values
  ('Datas comemorativas', 'party-popper', 1),
  ('Conceito da campanha', 'lightbulb', 2),
  ('Mecânica da promoção', 'tag', 3),
  ('Estampas novas', 'shirt', 4),
  ('Captação', 'camera', 5),
  ('Lista VIP', 'crown', 6)
) as c(label, icone, posicao)
where not exists (select 1 from public.estrategia_campos e where e.frente = f.frente);