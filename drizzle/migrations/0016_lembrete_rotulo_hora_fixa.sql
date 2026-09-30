CREATE OR REPLACE FUNCTION public.notificacoes_gerar_lembretes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        else 'Entrega às ' || to_char(r.hora_entrega, 'HH24:MI')
      end;
      perform public.notificar(r.responsavel_id, 'lembrete', r.id, r.quadro_id, v_rotulo, r.titulo);
      v_total := v_total + 1;
    end if;
  end loop;
  return v_total;
end; $function$;