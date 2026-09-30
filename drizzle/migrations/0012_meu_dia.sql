create table if not exists public.feriados (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  descricao text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.feriados to authenticated;
grant all on public.feriados to service_role;
alter table public.feriados enable row level security;
create policy "feriados_todos_leem" on public.feriados
  for select to authenticated using (auth.uid() is not null);
create policy "feriados_gestao_escreve" on public.feriados
  for all to authenticated using (public.has_role('admin') or public.has_role('gestor'))
  with check (public.has_role('admin') or public.has_role('gestor'));

create table if not exists public.meudia_recorrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  descricao text not null default '',
  vezes_mes integer not null default 1,
  blocos integer not null default 1 check (blocos between 1 and 4),
  dia_semana text not null default 'livre',
  hora time,
  ativo boolean not null default true,
  posicao integer not null default 0,
  created_at timestamptz not null default now(),
  constraint meudia_recorrentes_dia_check check (dia_semana in ('livre','seg','ter','qua','qui','sex','ultimo_dia_util'))
);

create table if not exists public.meudia_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  data date not null,
  bloco_inicio integer not null check (bloco_inicio between 1 and 4),
  blocos integer not null default 1 check (blocos between 1 and 4),
  texto text not null default '',
  card_id uuid references public.tarefa_cards(id) on delete set null,
  recorrente_id uuid references public.meudia_recorrentes(id) on delete set null,
  feito boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_meudia_itens_periodo on public.meudia_itens (user_id, data, bloco_inicio);

create table if not exists public.meudia_diario (
  user_id uuid not null references public.profiles(id) on delete cascade,
  data date not null,
  modo text,
  texto text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, data),
  constraint meudia_diario_modo_check check (modo is null or modo in ('P','HO'))
);

grant select, insert, update, delete on public.meudia_recorrentes, public.meudia_itens, public.meudia_diario to authenticated;
grant all on public.meudia_recorrentes, public.meudia_itens, public.meudia_diario to service_role;

alter table public.meudia_recorrentes enable row level security;
alter table public.meudia_itens enable row level security;
alter table public.meudia_diario enable row level security;

create policy "meudia_recorrentes_minhas" on public.meudia_recorrentes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meudia_itens_meus" on public.meudia_itens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meudia_diario_meu" on public.meudia_diario
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.meudia_gravar_diario(_data date, _modo text, _texto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;
  insert into public.meudia_diario (user_id, data, modo, texto)
  values (auth.uid(), _data, _modo, coalesce(_texto,''))
  on conflict (user_id, data)
  do update set modo = excluded.modo, texto = excluded.texto, updated_at = now();
end;
$$;

create or replace function public.meudia_reordenar_recorrentes(_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.meudia_recorrentes r
     set posicao = t.ord
    from (select unnest(_ids) as id, generate_subscripts(_ids, 1) as ord) t
   where r.id = t.id and r.user_id = auth.uid();
end;
$$;