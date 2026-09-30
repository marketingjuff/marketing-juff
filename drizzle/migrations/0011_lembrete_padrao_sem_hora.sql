alter table public.tarefa_cards drop constraint if exists tarefa_cards_lembrete_check;
alter table public.tarefa_cards add constraint tarefa_cards_lembrete_check
  check (lembrete_min is null or lembrete_min in (0, 5, 15, 30, 60, 120, 1440)) not valid;
alter table public.tarefa_cards alter column lembrete_min set default 0;
update public.tarefa_cards set lembrete_min = 0
 where lembrete_min is null and data_entrega is not null and arquivado = false;

create or replace function public.notificacoes_gerar_lembretes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; v_total integer := 0;
  v_agora timestamp := (now() at time zone 'America/Sao_Paulo');
  v_entrega timestamp; v_quando timestamp; v_rotulo text;
begin
  for r in
    select id, titulo, quadro_id, responsavel_id, data_entrega, hora_entrega, lembrete_min
      from public.tarefa_cards
     where responsavel_id is not null and arquivado = false and concluido = false
       and lembrete_min is not null and data_entrega is not null
       and data_entrega between (v_agora::date - 2) and (v_agora::date + 2)
  loop
    v_entrega := r.data_entrega + coalesce(r.hora_entrega, time '00:00');
    v_quando := v_entrega - make_interval(mins => r.lembrete_min);
    if v_agora >= v_quando and v_agora < (r.data_entrega + 1) then
      v_rotulo := case
        when r.hora_entrega is null then 'Entrega hoje'
        when r.lembrete_min = 0 then 'Agora, ' || to_char(r.hora_entrega, 'HH24:MI')
        when r.lembrete_min = 1440 then 'Amanhã, ' || to_char(r.hora_entrega, 'HH24:MI')
        else 'Em ' || r.lembrete_min || ' min, ' || to_char(r.hora_entrega, 'HH24:MI')
      end;
      perform public.notificar(r.responsavel_id, 'lembrete', r.id, r.quadro_id, v_rotulo, r.titulo);
      v_total := v_total + 1;
    end if;
  end loop;
  return v_total;
end; $$;