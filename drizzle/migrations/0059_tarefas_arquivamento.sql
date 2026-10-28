alter table public.tarefa_cards add column if not exists arquivado_em timestamptz;
create index if not exists tarefa_cards_arquivados_idx on public.tarefa_cards (quadro_id, arquivado_em desc) where arquivado = true;
create or replace function public.trg_tarefa_card_arquivado_em()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.arquivado and not old.arquivado then
    new.arquivado_em := now();
  elsif not new.arquivado and old.arquivado then
    new.arquivado_em := null;
  end if;
  return new;
end; $fn$;
drop trigger if exists tarefa_card_arquivado_em on public.tarefa_cards;
create trigger tarefa_card_arquivado_em before update on public.tarefa_cards for each row execute function public.trg_tarefa_card_arquivado_em();
update public.tarefa_cards set arquivado_em = updated_at where arquivado = true and arquivado_em is null;
create or replace function public.tarefa_arquivar_concluidos()
returns integer language plpgsql security definer set search_path = public as $fn$
declare
  v_ids uuid[];
  v_total integer;
begin
  select coalesce(array_agg(id), '{}'::uuid[]) into v_ids from public.tarefa_cards
   where arquivado = false and concluido = true and concluido_em is not null
     and updated_at < now() - interval '30 days';
  v_total := coalesce(array_length(v_ids, 1), 0);
  if v_total = 0 then return 0; end if;
  update public.tarefa_cards set arquivado = true where id = any(v_ids);
  insert into public.tarefa_historico (card_id, autor_id, acao, detalhe)
  select t.cid, null, 'Arquivou', 'Arquivamento automático, 30 dias concluído sem alteração' from unnest(v_ids) as t(cid);
  return v_total;
end; $fn$;
revoke execute on function public.tarefa_arquivar_concluidos() from public, anon, authenticated;