alter table public.tarefa_cards
  add column if not exists hora_inicio time,
  add column if not exists hora_entrega time,
  add column if not exists recorrencia text not null default 'nunca';

alter table public.tarefa_cards
  add constraint tarefa_cards_recorrencia_check
  check (recorrencia in ('nunca','diario','dias_uteis','semanal','mensal_dia','mensal_semana'));

create index if not exists idx_tarefa_cards_recorrentes
  on public.tarefa_cards (recorrencia, data_entrega)
  where recorrencia <> 'nunca';

create or replace function public.proxima_ocorrencia(_data date, _regra text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_prox date;
  v_dia integer;
  v_dow integer;
  v_ordem integer;
  v_ultima boolean;
  v_mes date;
  v_fim date;
begin
  if _data is null then
    return null;
  end if;
  if _regra = 'diario' then
    return _data + 1;
  end if;
  if _regra = 'dias_uteis' then
    v_prox := _data + 1;
    while extract(dow from v_prox) in (0, 6) loop
      v_prox := v_prox + 1;
    end loop;
    return v_prox;
  end if;
  if _regra = 'semanal' then
    return _data + 7;
  end if;
  if _regra = 'mensal_dia' then
    v_dia := extract(day from _data);
    v_mes := (date_trunc('month', _data) + interval '1 month')::date;
    v_fim := (date_trunc('month', v_mes) + interval '1 month - 1 day')::date;
    return least(v_mes + (v_dia - 1), v_fim);
  end if;
  if _regra = 'mensal_semana' then
    v_dow := extract(dow from _data);
    v_ordem := ((extract(day from _data)::integer - 1) / 7) + 1;
    v_mes := (date_trunc('month', _data) + interval '1 month')::date;
    v_fim := (date_trunc('month', v_mes) + interval '1 month - 1 day')::date;
    v_ultima := (_data + 7) > (date_trunc('month', _data) + interval '1 month - 1 day')::date;
    if v_ultima then
      v_prox := v_fim;
      while extract(dow from v_prox) <> v_dow loop
        v_prox := v_prox - 1;
      end loop;
      return v_prox;
    end if;
    v_prox := v_mes;
    while extract(dow from v_prox) <> v_dow loop
      v_prox := v_prox + 1;
    end loop;
    v_prox := v_prox + ((v_ordem - 1) * 7);
    if v_prox > v_fim then
      v_prox := v_prox - 7;
    end if;
    return v_prox;
  end if;
  return null;
end;
$$;

create or replace function public.tarefa_card_avancar(_id uuid)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_prox date;
  v_passo integer;
  v_giros integer := 0;
begin
  if not public.pode_mexer_card(_id) then
    raise exception 'sem permissao';
  end if;
  select id, data_inicio, data_entrega, recorrencia
    into c
    from public.tarefa_cards
   where id = _id;
  if c.recorrencia is null or c.recorrencia = 'nunca' or c.data_entrega is null then
    return null;
  end if;
  v_prox := public.proxima_ocorrencia(c.data_entrega, c.recorrencia);
  while v_prox is not null and v_prox <= current_date and v_giros < 400 loop
    v_prox := public.proxima_ocorrencia(v_prox, c.recorrencia);
    v_giros := v_giros + 1;
  end loop;
  if v_prox is null then
    return null;
  end if;
  v_passo := v_prox - c.data_entrega;
  update public.tarefa_cards
     set data_entrega = v_prox,
         data_inicio = case when data_inicio is null then null else data_inicio + v_passo end,
         concluido = false,
         concluido_em = null,
         updated_at = now()
   where id = _id;
  return v_prox;
end;
$$;

create or replace function public.tarefa_avancar_recorrentes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total integer := 0;
begin
  for r in
    select id
      from public.tarefa_cards
     where recorrencia <> 'nunca'
       and data_entrega is not null
       and arquivado = false
       and (
         data_entrega < current_date
         or (data_entrega = current_date and hora_entrega is not null and hora_entrega < current_time::time)
       )
       and public.pode_mexer_card(id)
  loop
    perform public.tarefa_card_avancar(r.id);
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;