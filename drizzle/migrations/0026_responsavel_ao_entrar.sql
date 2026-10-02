alter table public.tarefa_colunas add column if not exists resp_ao_entrar text not null default 'padrao';
alter table public.tarefa_colunas add column if not exists resp_coluna_origem_id uuid references public.tarefa_colunas(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tarefa_colunas_resp_ao_entrar_check') then
    alter table public.tarefa_colunas add constraint tarefa_colunas_resp_ao_entrar_check
      check (resp_ao_entrar in ('padrao','arrastou','criador','quem_ficou'));
  end if;
end $$;
alter table public.tarefa_quadros add column if not exists exige_responsavel boolean not null default false;

create table if not exists public.tarefa_card_resp_coluna (
  card_id uuid not null references public.tarefa_cards(id) on delete cascade,
  coluna_id uuid not null references public.tarefa_colunas(id) on delete cascade,
  responsavel_id uuid,
  atualizado_em timestamptz not null default now(),
  primary key (card_id, coluna_id)
);
grant select on public.tarefa_card_resp_coluna to authenticated;
grant all on public.tarefa_card_resp_coluna to service_role;
alter table public.tarefa_card_resp_coluna enable row level security;
drop policy if exists "resp coluna leitura" on public.tarefa_card_resp_coluna;
create policy "resp coluna leitura" on public.tarefa_card_resp_coluna for select to authenticated using (public.pode_ver_card(card_id));

create or replace function public.tarefa_card_nasce_com_dono()
returns trigger language plpgsql security definer set search_path = public as $$
declare exige boolean;
begin
  if new.responsavel_id is not null then return new; end if;
  select q.exige_responsavel into exige from public.tarefa_quadros q where q.id = new.quadro_id;
  if coalesce(exige,false) then new.responsavel_id := coalesce(new.criado_por, auth.uid()); end if;
  return new;
end; $$;
drop trigger if exists trg_card_nasce_com_dono on public.tarefa_cards;
create trigger trg_card_nasce_com_dono before insert on public.tarefa_cards
  for each row execute function public.tarefa_card_nasce_com_dono();

create or replace function public.tarefa_card_responsavel_ao_entrar()
returns trigger language plpgsql security definer set search_path = public as $$
declare exige boolean; regra text; origem uuid; candidato uuid;
begin
  if new.coluna_id is not distinct from old.coluna_id then return new; end if;
  select q.exige_responsavel into exige from public.tarefa_quadros q where q.id = new.quadro_id;
  if coalesce(exige,false) and old.responsavel_id is null and new.responsavel_id is null then
    raise exception 'Escolha um responsável antes de mover este card';
  end if;
  if old.responsavel_id is not null then
    insert into public.tarefa_card_resp_coluna (card_id, coluna_id, responsavel_id, atualizado_em)
    values (new.id, old.coluna_id, old.responsavel_id, now())
    on conflict (card_id, coluna_id) do update set responsavel_id = excluded.responsavel_id, atualizado_em = now();
  end if;
  select c.resp_ao_entrar, c.resp_coluna_origem_id into regra, origem from public.tarefa_colunas c where c.id = new.coluna_id;
  if regra = 'arrastou' then candidato := auth.uid();
  elsif regra = 'criador' then candidato := new.criado_por;
  elsif regra = 'quem_ficou' and origem is not null then
    select r.responsavel_id into candidato from public.tarefa_card_resp_coluna r where r.card_id = new.id and r.coluna_id = origem;
  end if;
  if candidato is not null then new.responsavel_id := candidato; end if;
  return new;
end; $$;
drop trigger if exists trg_card_responsavel_ao_entrar on public.tarefa_cards;
create trigger trg_card_responsavel_ao_entrar before update of coluna_id on public.tarefa_cards
  for each row execute function public.tarefa_card_responsavel_ao_entrar();

create or replace function public.tarefa_card_registra_troca_responsavel()
returns trigger language plpgsql security definer set search_path = public as $$
declare antes text; depois text;
begin
  if new.coluna_id is not distinct from old.coluna_id then return null; end if;
  if new.responsavel_id is not distinct from old.responsavel_id then return null; end if;
  select p.nome into antes from public.profiles p where p.id = old.responsavel_id;
  select p.nome into depois from public.profiles p where p.id = new.responsavel_id;
  insert into public.tarefa_historico (card_id, acao, detalhe, autor_id)
  values (new.id, 'Trocou responsável', coalesce(antes,'ninguém') || ' → ' || coalesce(depois,'ninguém') || ', pela regra da coluna', auth.uid());
  return null;
end; $$;
drop trigger if exists trg_card_registra_troca_responsavel on public.tarefa_cards;
create trigger trg_card_registra_troca_responsavel after update of coluna_id on public.tarefa_cards
  for each row execute function public.tarefa_card_registra_troca_responsavel();