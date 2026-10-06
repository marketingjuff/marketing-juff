create table if not exists public.social_seeding_remessas (
  id uuid primary key default gen_random_uuid(),
  mes date not null,
  motivo text not null,
  observacao text,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists social_seeding_remessas_mes_motivo_uq on public.social_seeding_remessas(mes, motivo);
create index if not exists social_seeding_remessas_mes_idx on public.social_seeding_remessas(mes);

create table if not exists public.social_seeding_pecas (
  id uuid primary key default gen_random_uuid(),
  remessa_id uuid not null references public.social_seeding_remessas(id) on delete cascade,
  produto_id uuid references public.biblioteca_produtos(id) on delete set null,
  produto_nome text,
  cor_id uuid references public.biblioteca_cores(id) on delete set null,
  cor_nome text,
  tamanho text,
  estampa_id uuid references public.biblioteca_estampas(id) on delete set null,
  estampa_nome text,
  pessoa text,
  pedido boolean not null default false,
  produzida boolean not null default false,
  enviada boolean not null default false,
  captada boolean not null default false,
  retorna boolean not null default false,
  devolvida boolean not null default false,
  observacao text,
  posicao integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_seeding_pecas_remessa_pos_idx on public.social_seeding_pecas(remessa_id, posicao);
create index if not exists social_seeding_pecas_pessoa_idx on public.social_seeding_pecas(pessoa);

create table if not exists public.social_seeding_custos (
  mes date primary key,
  valor numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.social_seeding_custos(mes, valor) values (date_trunc('month', now())::date, 28.00) on conflict do nothing;

create or replace function public.social_seeding_pecas_normaliza() returns trigger language plpgsql set search_path = public as $$
begin
  if not new.retorna then new.devolvida := false; end if;
  new.pessoa := nullif(btrim(coalesce(new.pessoa, '')), '');
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists social_seeding_pecas_coerencia on public.social_seeding_pecas;
drop trigger if exists social_seeding_pecas_pessoa on public.social_seeding_pecas;
create trigger social_seeding_pecas_coerencia before insert or update on public.social_seeding_pecas
  for each row execute function public.social_seeding_pecas_normaliza();

grant select, insert, update, delete on public.social_seeding_remessas, public.social_seeding_pecas, public.social_seeding_custos to authenticated;
grant all on public.social_seeding_remessas, public.social_seeding_pecas, public.social_seeding_custos to service_role;

alter table public.social_seeding_remessas enable row level security;
alter table public.social_seeding_pecas enable row level security;
alter table public.social_seeding_custos enable row level security;

drop policy if exists seeding_remessas_select on public.social_seeding_remessas;
drop policy if exists seeding_remessas_write on public.social_seeding_remessas;
create policy seeding_remessas_select on public.social_seeding_remessas for select to authenticated using (public.has_permission('social.seeding'));
create policy seeding_remessas_write on public.social_seeding_remessas for all to authenticated using (public.can_edit('social.seeding')) with check (public.can_edit('social.seeding'));

drop policy if exists seeding_pecas_select on public.social_seeding_pecas;
drop policy if exists seeding_pecas_write on public.social_seeding_pecas;
create policy seeding_pecas_select on public.social_seeding_pecas for select to authenticated using (public.has_permission('social.seeding'));
create policy seeding_pecas_write on public.social_seeding_pecas for all to authenticated using (public.can_edit('social.seeding')) with check (public.can_edit('social.seeding'));

drop policy if exists seeding_custos_select on public.social_seeding_custos;
drop policy if exists seeding_custos_write on public.social_seeding_custos;
create policy seeding_custos_select on public.social_seeding_custos for select to authenticated using (public.has_permission('social.seeding') or public.has_role('gestor'));
create policy seeding_custos_write on public.social_seeding_custos for all to authenticated using (public.can_edit('social.seeding') or public.has_role('gestor')) with check (public.can_edit('social.seeding') or public.has_role('gestor'));

create or replace function public.social_seeding_custo_do_mes(p_mes date) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select valor from public.social_seeding_custos where mes <= date_trunc('month', p_mes)::date order by mes desc limit 1), 0)
$$;

create or replace function public.social_seeding_marcar_coluna(p_remessa uuid, p_campo text, p_valor boolean) returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_campo not in ('pedido','produzida','enviada','captada','retorna','devolvida') then
    raise exception 'Campo inválido: %', p_campo;
  end if;
  execute format('update public.social_seeding_pecas set %I = $1 where remessa_id = $2', p_campo) using p_valor, p_remessa;
end $$;

create or replace function public.social_seeding_painel(p_de date, p_ate date) returns json language sql stable security invoker set search_path = public as $$
  with p as (
    select pc.*, r.mes from public.social_seeding_pecas pc join public.social_seeding_remessas r on r.id = pc.remessa_id
    where r.mes between date_trunc('month', p_de)::date and date_trunc('month', p_ate)::date
  ), custo as (select mes, public.social_seeding_custo_do_mes(mes) v from (select distinct mes from p) m)
  select json_build_object(
    'total', (select count(*) from p),
    'custo', (select coalesce(sum(c.v), 0) from p join custo c using (mes)),
    'aguardando', (select count(*) from p where enviada and not captada),
    'retorna', (select count(*) from p where retorna),
    'a_devolver', (select count(*) from p where retorna and not devolvida),
    'pessoas', coalesce((select json_agg(json_build_object('pessoa', pessoa, 'qtd', qtd) order by qtd desc, pessoa)
       from (select pessoa, count(*) qtd from p where pessoa is not null and ((enviada and not captada) or (retorna and not devolvida)) group by pessoa) x), '[]'::json)
  )
$$;