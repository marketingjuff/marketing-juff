alter table public.tarefa_quadros add column if not exists cards_privados boolean not null default false;
comment on column public.tarefa_quadros.cards_privados is 'Quando verdadeiro, operador só enxerga os cards em que é responsável ou membro. Admin e gestor enxergam tudo.';
alter table public.tarefa_etiquetas add column if not exists fixa_topo boolean not null default false;
comment on column public.tarefa_etiquetas.fixa_topo is 'Card com esta etiqueta sobe ao topo da coluna no quadro.';

create table if not exists public.tarefa_card_membros (
  card_id uuid not null references public.tarefa_cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, user_id)
);
create index if not exists tarefa_card_membros_user_idx on public.tarefa_card_membros (user_id);
grant select, insert, delete on public.tarefa_card_membros to authenticated;
grant all on public.tarefa_card_membros to service_role;
alter table public.tarefa_card_membros enable row level security;

create or replace function public.tarefa_ve_tudo() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','gestor'));
$$;

create or replace function public.tarefa_card_privado_visivel(p_card_id uuid, p_quadro_id uuid, p_responsavel_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when not coalesce((select q.cards_privados from public.tarefa_quadros q where q.id = p_quadro_id), false) then true
    when public.tarefa_ve_tudo() then true
    when p_responsavel_id is not null and p_responsavel_id = auth.uid() then true
    else exists (select 1 from public.tarefa_card_membros m where m.card_id = p_card_id and m.user_id = auth.uid())
  end;
$$;

drop policy if exists "cards_select" on public.tarefa_cards;
create policy "cards_select" on public.tarefa_cards for select to authenticated
  using ((pode_ver_quadro(quadro_id)) and public.tarefa_card_privado_visivel(id, quadro_id, responsavel_id));
drop policy if exists "cards_update" on public.tarefa_cards;
create policy "cards_update" on public.tarefa_cards for update to authenticated
  using ((pode_mexer_card(id)) and public.tarefa_card_privado_visivel(id, quadro_id, responsavel_id))
  with check (pode_mexer_card(id));
drop policy if exists "cards_delete" on public.tarefa_cards;
create policy "cards_delete" on public.tarefa_cards for delete to authenticated
  using ((has_role('admin'::app_role)) and public.tarefa_card_privado_visivel(id, quadro_id, responsavel_id));

drop policy if exists "membros_card_select" on public.tarefa_card_membros;
create policy "membros_card_select" on public.tarefa_card_membros for select to authenticated
  using (exists (select 1 from public.tarefa_cards c where c.id = card_id));
drop policy if exists "membros_card_insert" on public.tarefa_card_membros;
create policy "membros_card_insert" on public.tarefa_card_membros for insert to authenticated
  with check (exists (select 1 from public.tarefa_cards c where c.id = card_id));
drop policy if exists "membros_card_delete" on public.tarefa_card_membros;
create policy "membros_card_delete" on public.tarefa_card_membros for delete to authenticated
  using (exists (select 1 from public.tarefa_cards c where c.id = card_id));

create or replace function public.tarefa_resp_antigo_vira_membro() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.responsavel_id is distinct from old.responsavel_id and old.responsavel_id is not null
     and coalesce((select q.cards_privados from public.tarefa_quadros q where q.id = new.quadro_id), false) then
    insert into public.tarefa_card_membros (card_id, user_id) values (new.id, old.responsavel_id) on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists trg_tarefa_resp_antigo_vira_membro on public.tarefa_cards;
create trigger trg_tarefa_resp_antigo_vira_membro after update of responsavel_id on public.tarefa_cards
  for each row execute function public.tarefa_resp_antigo_vira_membro();

create or replace function public.tarefa_quem_moveu_vira_membro() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.coluna_id is distinct from old.coluna_id and auth.uid() is not null
     and coalesce((select q.cards_privados from public.tarefa_quadros q where q.id = new.quadro_id), false) then
    insert into public.tarefa_card_membros (card_id, user_id) values (new.id, auth.uid()) on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists trg_tarefa_quem_moveu_vira_membro on public.tarefa_cards;
create trigger trg_tarefa_quem_moveu_vira_membro after update of coluna_id on public.tarefa_cards
  for each row execute function public.tarefa_quem_moveu_vira_membro();

CREATE OR REPLACE FUNCTION public.trg_notificar_comentario()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  c record; p record;
  v_autor uuid := coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000'::uuid);
begin
  select id, titulo, quadro_id, responsavel_id into c from public.tarefa_cards where id = new.card_id;
  if c.id is null then return new; end if;
  if c.responsavel_id is not null and c.responsavel_id <> v_autor then
    perform public.notificar(c.responsavel_id, 'comentario', c.id, c.quadro_id, 'Novo comentário', c.titulo);
  end if;
  for p in select id from public.profiles where nome is not null and length(nome) > 1 and new.texto ilike '%@' || nome || '%' loop
    if p.id <> v_autor and p.id is distinct from c.responsavel_id then
      perform public.notificar(p.id, 'comentario', c.id, c.quadro_id, 'Marcaram você em um comentário', c.titulo);
    end if;
    if coalesce((select q.cards_privados from public.tarefa_quadros q join public.tarefa_cards cc on cc.quadro_id = q.id where cc.id = c.id), false) then
      insert into public.tarefa_card_membros (card_id, user_id) values (c.id, p.id) on conflict do nothing;
    end if;
  end loop;
  return new;
exception when others then return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.notificacoes_gerar_diarias()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  r record; v_total integer := 0;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for r in select id, titulo, quadro_id, responsavel_id from public.tarefa_cards
     where responsavel_id is not null and arquivado = false and concluido = false and data_entrega = v_hoje + 1 loop
    perform public.notificar(r.responsavel_id, 'vence_amanha', r.id, r.quadro_id, 'Vence amanhã', r.titulo);
    v_total := v_total + 1;
  end loop;
  for r in select id, titulo, quadro_id, responsavel_id from public.tarefa_cards
     where responsavel_id is not null and arquivado = false and concluido = false and data_entrega is not null and data_entrega < v_hoje loop
    perform public.notificar(r.responsavel_id, 'atrasado', r.id, r.quadro_id, 'Card atrasado', r.titulo);
    v_total := v_total + 1;
  end loop;
  return v_total;
end; $function$;