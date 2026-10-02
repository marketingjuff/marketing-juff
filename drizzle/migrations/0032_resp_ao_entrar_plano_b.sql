create or replace function public.tarefa_card_responsavel_ao_entrar()
returns trigger language plpgsql security definer set search_path = public as $$
declare exige boolean; regra text; origem uuid; candidato uuid;
begin
  if new.coluna_id is not distinct from old.coluna_id then return new; end if;
  select q.exige_responsavel into exige from public.tarefa_quadros q where q.id = new.quadro_id;
  if coalesce(exige, false) and old.responsavel_id is null and new.responsavel_id is null then
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
  elsif regra = 'quem_ficou' then
    if origem is not null then
      select r.responsavel_id into candidato from public.tarefa_card_resp_coluna r where r.card_id = new.id and r.coluna_id = origem;
    end if;
    if candidato is null then candidato := auth.uid(); end if;
  end if;
  if candidato is not null then new.responsavel_id := candidato; end if;
  return new;
end; $$;