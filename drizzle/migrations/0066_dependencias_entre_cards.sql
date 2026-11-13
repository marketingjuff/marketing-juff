create table if not exists public.tarefa_card_dependencias (
  card_id uuid not null,
  depende_de_id uuid not null,
  criado_por uuid,
  created_at timestamptz not null default now(),
  constraint tarefa_card_dependencias_pkey primary key (card_id, depende_de_id),
  constraint tarefa_card_dependencias_card_id_fkey
    foreign key (card_id) references public.tarefa_cards(id) on delete cascade,
  constraint tarefa_card_dependencias_depende_de_id_fkey
    foreign key (depende_de_id) references public.tarefa_cards(id) on delete cascade,
  constraint tarefa_card_dependencias_criado_por_fkey
    foreign key (criado_por) references public.profiles(id) on delete set null,
  constraint tarefa_card_dependencias_nao_aponta_para_si check (card_id <> depende_de_id)
);

comment on table public.tarefa_card_dependencias is
  'Card da esquerda depende do card da direita. A coluna antiga tarefa_cards.depende_de segue existindo apenas como anotação de texto.';

create index if not exists tarefa_card_dependencias_alvo_idx
  on public.tarefa_card_dependencias (depende_de_id);

grant select, insert, delete on public.tarefa_card_dependencias to authenticated;
grant all on public.tarefa_card_dependencias to service_role;

alter table public.tarefa_card_dependencias enable row level security;

drop policy if exists "dependencias_select" on public.tarefa_card_dependencias;
create policy "dependencias_select" on public.tarefa_card_dependencias for select to authenticated
  using (
    exists (select 1 from public.tarefa_cards c where c.id = card_id)
    or exists (select 1 from public.tarefa_cards c where c.id = depende_de_id)
  );

drop policy if exists "dependencias_insert" on public.tarefa_card_dependencias;
create policy "dependencias_insert" on public.tarefa_card_dependencias for insert to authenticated
  with check (
    public.pode_mexer_card(card_id)
    and exists (select 1 from public.tarefa_cards c where c.id = depende_de_id)
  );

drop policy if exists "dependencias_delete" on public.tarefa_card_dependencias;
create policy "dependencias_delete" on public.tarefa_card_dependencias for delete to authenticated
  using (public.pode_mexer_card(card_id));

create or replace function public.tarefa_dependencias_pendentes(_quadro_id uuid)
returns table (card_id uuid, pendentes integer)
language sql
stable
set search_path = public
as $$
  select d.card_id, count(*)::integer
    from public.tarefa_card_dependencias d
    join public.tarefa_cards c on c.id = d.card_id
    join public.tarefa_cards alvo on alvo.id = d.depende_de_id
   where c.quadro_id = _quadro_id
     and c.arquivado = false
     and c.concluido = false
     and alvo.concluido = false
     and alvo.arquivado = false
   group by d.card_id;
$$;

grant execute on function public.tarefa_dependencias_pendentes(uuid) to authenticated;