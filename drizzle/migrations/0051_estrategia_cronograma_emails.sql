create table if not exists public.estrategia_email_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  posicao integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists estrategia_email_tipos_nome_idx on public.estrategia_email_tipos (upper(btrim(nome)));

create table if not exists public.estrategia_email_regras (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default '',
  texto text not null,
  tipo_id uuid references public.estrategia_email_tipos(id) on delete cascade,
  posicao integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.estrategia_emails (
  id uuid primary key default gen_random_uuid(),
  ata_id uuid not null references public.estrategia_atas(id) on delete cascade,
  data date not null,
  tipo_id uuid references public.estrategia_email_tipos(id) on delete set null,
  tema text not null default '',
  conteudo text not null default '',
  chamada text not null default '',
  posicao integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists estrategia_emails_ata_idx on public.estrategia_emails (ata_id, data);

alter table public.estrategia_atas add column if not exists emails_doc_url text not null default '';

create table if not exists public.estrategia_email_pedidos (
  ata_id uuid primary key references public.estrategia_atas(id) on delete cascade,
  total integer not null default 0,
  itens jsonb not null default '[]'::jsonb,
  extras integer not null default 0,
  observacoes text not null default '',
  dias_evitar text not null default '',
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.estrategia_email_tipos, public.estrategia_email_regras, public.estrategia_emails, public.estrategia_email_pedidos to authenticated;
grant all on public.estrategia_email_tipos, public.estrategia_email_regras, public.estrategia_emails, public.estrategia_email_pedidos to service_role;

alter table public.estrategia_email_tipos enable row level security;
alter table public.estrategia_email_regras enable row level security;
alter table public.estrategia_emails enable row level security;
alter table public.estrategia_email_pedidos enable row level security;

drop policy if exists estrategia_email_tipos_select on public.estrategia_email_tipos;
create policy estrategia_email_tipos_select on public.estrategia_email_tipos for select to authenticated using (true);
drop policy if exists estrategia_email_tipos_write on public.estrategia_email_tipos;
create policy estrategia_email_tipos_write on public.estrategia_email_tipos for all to authenticated
  using (public.has_role('admin') or public.has_role('gestor')) with check (public.has_role('admin') or public.has_role('gestor'));

drop policy if exists estrategia_email_regras_select on public.estrategia_email_regras;
create policy estrategia_email_regras_select on public.estrategia_email_regras for select to authenticated using (true);
drop policy if exists estrategia_email_regras_write on public.estrategia_email_regras;
create policy estrategia_email_regras_write on public.estrategia_email_regras for all to authenticated
  using (public.has_role('admin') or public.has_role('gestor')) with check (public.has_role('admin') or public.has_role('gestor'));

drop policy if exists estrategia_emails_select on public.estrategia_emails;
create policy estrategia_emails_select on public.estrategia_emails for select to authenticated using (public.has_permission('estrategia.emails'));
drop policy if exists estrategia_emails_write on public.estrategia_emails;
create policy estrategia_emails_write on public.estrategia_emails for all to authenticated
  using (public.can_edit('estrategia.emails') and (public.has_role('admin') or public.has_role('gestor')))
  with check (public.can_edit('estrategia.emails') and (public.has_role('admin') or public.has_role('gestor')));

drop policy if exists estrategia_email_pedidos_select on public.estrategia_email_pedidos;
create policy estrategia_email_pedidos_select on public.estrategia_email_pedidos for select to authenticated using (public.has_permission('estrategia.emails'));
drop policy if exists estrategia_email_pedidos_write on public.estrategia_email_pedidos;
create policy estrategia_email_pedidos_write on public.estrategia_email_pedidos for all to authenticated
  using (public.can_edit('estrategia.emails') and (public.has_role('admin') or public.has_role('gestor')))
  with check (public.can_edit('estrategia.emails') and (public.has_role('admin') or public.has_role('gestor')));

insert into public.estrategia_email_tipos (nome, posicao)
select v.nome, v.posicao from (values
  ('Campanha', 1), ('Comemorativa', 2), ('Branding', 3), ('Estampa', 4),
  ('Lisas', 5), ('Lançamento', 6), ('Promocional', 7), ('Outlet', 8),
  ('Personalização', 9), ('Juff Custom', 10)) as v(nome, posicao)
where not exists (select 1 from public.estrategia_email_tipos t where upper(btrim(t.nome)) = upper(btrim(v.nome)));

insert into public.estrategia_email_regras (titulo, texto, tipo_id, posicao)
select 'Juff Custom não divulga campanha da Juff Store',
  'O e-mail de Juff Custom fala apenas de Juff Custom. Não cite campanha, cupom, desconto ou promoção da Juff Store em lugar nenhum do e-mail, nem no assunto, nem no corpo, nem como chamada secundária, nem em rodapé. Quando a Juff Store tiver campanha no mesmo mês, ela simplesmente não entra neste e-mail. O cliente de Juff Custom é empresa e entende qualquer desconto citado como desconto dele.',
  (select id from public.estrategia_email_tipos where upper(btrim(nome)) = 'JUFF CUSTOM'), 1
where not exists (select 1 from public.estrategia_email_regras where titulo = 'Juff Custom não divulga campanha da Juff Store');

-- Ata do mês para o cronograma: mesma lógica de estrategia_ata_id, mas checando a chave de e-mails.
create or replace function public.estrategia_emails_ata_id(_ano integer, _mes integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (public.can_edit('estrategia.emails') and (public.has_role('admin') or public.has_role('gestor'))) then
    raise exception 'sem permissao';
  end if;
  select id into v_id from public.estrategia_atas where frente = 'store' and ano = _ano and mes = _mes;
  if v_id is null then
    insert into public.estrategia_atas (frente, ano, mes, criado_por) values ('store', _ano, _mes, auth.uid())
    on conflict (frente, ano, mes) do nothing returning id into v_id;
    if v_id is null then
      select id into v_id from public.estrategia_atas where frente = 'store' and ano = _ano and mes = _mes;
    end if;
  end if;
  return v_id;
end; $$;

create or replace function public.estrategia_emails_aplicar(_ano integer, _mes integer, _linhas jsonb, _substituir boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare _ata_id uuid; _base integer; _inseridos integer;
begin
  _ata_id := public.estrategia_emails_ata_id(_ano, _mes);
  if _substituir then
    delete from public.estrategia_emails where ata_id = _ata_id;
    _base := 0;
  else
    select coalesce(max(posicao), 0) into _base from public.estrategia_emails where ata_id = _ata_id;
  end if;
  insert into public.estrategia_emails (ata_id, data, tipo_id, tema, conteudo, chamada, posicao)
  select _ata_id, (linha->>'data')::date, nullif(linha->>'tipo_id','')::uuid,
    coalesce(linha->>'tema',''), coalesce(linha->>'conteudo',''), coalesce(linha->>'chamada',''), _base + (ord::integer)
  from jsonb_array_elements(_linhas) with ordinality as t(linha, ord);
  get diagnostics _inseridos = row_count;
  return _inseridos;
end; $$;

create or replace function public.estrategia_email_pedido_gravar(_ano integer, _mes integer, _total integer, _itens jsonb, _extras integer, _observacoes text, _dias_evitar text)
returns void language plpgsql security definer set search_path = public as $$
declare _ata_id uuid;
begin
  _ata_id := public.estrategia_emails_ata_id(_ano, _mes);
  insert into public.estrategia_email_pedidos (ata_id, total, itens, extras, observacoes, dias_evitar, updated_at)
  values (_ata_id, _total, _itens, _extras, _observacoes, _dias_evitar, now())
  on conflict (ata_id) do update set total = excluded.total, itens = excluded.itens, extras = excluded.extras,
    observacoes = excluded.observacoes, dias_evitar = excluded.dias_evitar, updated_at = now();
end; $$;

create or replace function public.estrategia_emails_doc_url(_ano integer, _mes integer, _url text)
returns void language plpgsql security definer set search_path = public as $$
declare _ata_id uuid;
begin
  _ata_id := public.estrategia_emails_ata_id(_ano, _mes);
  update public.estrategia_atas set emails_doc_url = coalesce(_url, '') where id = _ata_id;
end; $$;

create or replace function public.estrategia_email_reordenar(_tabela text, _ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role('admin') or public.has_role('gestor')) then raise exception 'sem permissao'; end if;
  if _tabela = 'tipos' then
    update public.estrategia_email_tipos t set posicao = x.ord from unnest(_ids) with ordinality x(id, ord) where t.id = x.id;
  elsif _tabela = 'regras' then
    update public.estrategia_email_regras t set posicao = x.ord from unnest(_ids) with ordinality x(id, ord) where t.id = x.id;
  else raise exception 'tabela invalida'; end if;
end; $$;

revoke execute on function public.estrategia_emails_ata_id(integer, integer) from anon, public;
revoke execute on function public.estrategia_emails_aplicar(integer, integer, jsonb, boolean) from anon, public;
revoke execute on function public.estrategia_email_pedido_gravar(integer, integer, integer, jsonb, integer, text, text) from anon, public;
revoke execute on function public.estrategia_emails_doc_url(integer, integer, text) from anon, public;
revoke execute on function public.estrategia_email_reordenar(text, uuid[]) from anon, public;
grant execute on function public.estrategia_emails_ata_id(integer, integer) to authenticated;
grant execute on function public.estrategia_emails_aplicar(integer, integer, jsonb, boolean) to authenticated;
grant execute on function public.estrategia_email_pedido_gravar(integer, integer, integer, jsonb, integer, text, text) to authenticated;
grant execute on function public.estrategia_emails_doc_url(integer, integer, text) to authenticated;
grant execute on function public.estrategia_email_reordenar(text, uuid[]) to authenticated;