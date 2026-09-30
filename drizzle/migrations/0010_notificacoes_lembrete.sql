alter table public.tarefa_cards add column if not exists lembrete_min integer;
alter table public.tarefa_cards drop constraint if exists tarefa_cards_lembrete_check;
alter table public.tarefa_cards add constraint tarefa_cards_lembrete_check
  check (lembrete_min is null or lembrete_min in (0, 5, 15, 30, 60, 120, 1440));

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('card_atribuido','comentario','lembrete','vence_amanha','atrasado','parado')),
  card_id uuid references public.tarefa_cards(id) on delete cascade,
  quadro_id uuid references public.tarefa_quadros(id) on delete cascade,
  titulo text not null default '',
  detalhe text not null default '',
  lida boolean not null default false,
  dia date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_notificacoes_pessoa on public.notificacoes (user_id, lida, created_at desc);
create unique index if not exists idx_notificacoes_sem_repetir on public.notificacoes (user_id, tipo, card_id, dia) where card_id is not null;

create table if not exists public.notificacao_preferencias (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('card_atribuido','comentario','lembrete','vence_amanha','atrasado','parado')),
  ativo boolean not null default true,
  primary key (user_id, tipo)
);

grant select, update, delete on public.notificacoes to authenticated;
grant all on public.notificacoes to service_role;
grant select, insert, update, delete on public.notificacao_preferencias to authenticated;
grant all on public.notificacao_preferencias to service_role;

alter table public.notificacoes enable row level security;
alter table public.notificacao_preferencias enable row level security;

create policy "notificacoes_minhas_select" on public.notificacoes for select to authenticated using (user_id = auth.uid());
create policy "notificacoes_minhas_update" on public.notificacoes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notificacoes_minhas_delete" on public.notificacoes for delete to authenticated using (user_id = auth.uid());
create policy "prefs_minhas_all" on public.notificacao_preferencias for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notificar(_user_id uuid, _tipo text, _card_id uuid, _quadro_id uuid, _titulo text, _detalhe text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ativo boolean;
begin
  if _user_id is null then return; end if;
  select ativo into v_ativo from public.notificacao_preferencias where user_id = _user_id and tipo = _tipo;
  if v_ativo is false then return; end if;
  insert into public.notificacoes (user_id, tipo, card_id, quadro_id, titulo, detalhe)
  values (_user_id, _tipo, _card_id, _quadro_id, coalesce(_titulo,''), coalesce(_detalhe,''))
  on conflict do nothing;
exception when others then return;
end; $$;
revoke execute on function public.notificar(uuid, text, uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.trg_notificar_atribuicao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.responsavel_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.responsavel_id is not distinct from old.responsavel_id then return new; end if;
  if new.responsavel_id = auth.uid() then return new; end if;
  perform public.notificar(new.responsavel_id, 'card_atribuido', new.id, new.quadro_id, 'Card atribuído a você', new.titulo);
  return new;
exception when others then return new;
end; $$;

drop trigger if exists notificar_atribuicao on public.tarefa_cards;
create trigger notificar_atribuicao after insert or update of responsavel_id on public.tarefa_cards
  for each row execute function public.trg_notificar_atribuicao();

create or replace function public.trg_notificar_comentario()
returns trigger language plpgsql security definer set search_path = public as $$
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
  end loop;
  return new;
exception when others then return new;
end; $$;

drop trigger if exists notificar_comentario on public.tarefa_comentarios;
create trigger notificar_comentario after insert on public.tarefa_comentarios
  for each row execute function public.trg_notificar_comentario();

create or replace function public.notificacoes_gerar_lembretes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; v_total integer := 0;
  v_agora timestamp := (now() at time zone 'America/Sao_Paulo');
  v_quando timestamp; v_rotulo text;
begin
  for r in
    select id, titulo, quadro_id, responsavel_id, data_entrega, hora_entrega, lembrete_min
      from public.tarefa_cards
     where responsavel_id is not null and arquivado = false and concluido = false
       and lembrete_min is not null and data_entrega is not null and hora_entrega is not null
       and data_entrega between (v_agora::date - 1) and (v_agora::date + 2)
  loop
    v_quando := (r.data_entrega + r.hora_entrega) - make_interval(mins => r.lembrete_min);
    if v_agora >= v_quando and v_agora < (r.data_entrega + r.hora_entrega) then
      v_rotulo := case when r.lembrete_min = 0 then 'Agora' when r.lembrete_min = 1440 then 'Amanhã' else 'Em ' || r.lembrete_min || ' min' end;
      perform public.notificar(r.responsavel_id, 'lembrete', r.id, r.quadro_id, v_rotulo || ', ' || to_char(r.hora_entrega, 'HH24:MI'), r.titulo);
      v_total := v_total + 1;
    end if;
  end loop;
  return v_total;
end; $$;
revoke execute on function public.notificacoes_gerar_lembretes() from public, anon, authenticated;

create or replace function public.notificacoes_gerar_diarias()
returns integer language plpgsql security definer set search_path = public as $$
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
  for r in select id, titulo, quadro_id, responsavel_id from public.tarefa_cards
     where responsavel_id is not null and arquivado = false and concluido = false and coluna_desde < now() - interval '5 days' loop
    perform public.notificar(r.responsavel_id, 'parado', r.id, r.quadro_id, 'Card parado', r.titulo);
    v_total := v_total + 1;
  end loop;
  return v_total;
end; $$;
revoke execute on function public.notificacoes_gerar_diarias() from public, anon, authenticated;

create or replace function public.notificacoes_marcar_todas()
returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  update public.notificacoes set lida = true where user_id = auth.uid() and lida = false;
  get diagnostics v = row_count;
  return v;
end; $$;

create extension if not exists pg_cron with schema extensions;