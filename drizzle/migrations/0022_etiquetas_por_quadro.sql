alter table public.tarefa_etiquetas
  add column if not exists quadro_id uuid references public.tarefa_quadros(id) on delete cascade;

create index if not exists tarefa_etiquetas_quadro_idx
  on public.tarefa_etiquetas (quadro_id);

do $$
declare
  r record;
begin
  if exists (select 1 from public.app_marcos where chave = 'fase4_etiquetas_maiusculas') then
    return;
  end if;

  update public.tarefa_etiquetas
     set nome = upper(btrim(nome))
   where nome <> upper(btrim(nome));

  for r in
    select
      e.id as perdedora,
      (
        select e2.id
          from public.tarefa_etiquetas e2
         where e2.nome = e.nome
           and e2.quadro_id is not distinct from e.quadro_id
         order by e2.posicao asc, e2.created_at asc
         limit 1
      ) as vencedora
      from public.tarefa_etiquetas e
  loop
    if r.vencedora is not null and r.vencedora <> r.perdedora then
      insert into public.tarefa_card_etiquetas (card_id, etiqueta_id)
      select ce.card_id, r.vencedora
        from public.tarefa_card_etiquetas ce
       where ce.etiqueta_id = r.perdedora
      on conflict do nothing;

      delete from public.tarefa_card_etiquetas where etiqueta_id = r.perdedora;
      delete from public.tarefa_etiquetas where id = r.perdedora;
    end if;
  end loop;

  insert into public.app_marcos (chave) values ('fase4_etiquetas_maiusculas');
end $$;

create unique index if not exists tarefa_etiquetas_nome_global_uq
  on public.tarefa_etiquetas (nome)
  where quadro_id is null;

create unique index if not exists tarefa_etiquetas_nome_quadro_uq
  on public.tarefa_etiquetas (quadro_id, nome)
  where quadro_id is not null;

create or replace function public.tarefa_etiqueta_normaliza()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.nome := upper(btrim(new.nome));
  new.cor := lower(new.cor);
  new.cor_texto := lower(new.cor_texto);
  return new;
end;
$$;

drop trigger if exists trg_tarefa_etiqueta_normaliza on public.tarefa_etiquetas;
create trigger trg_tarefa_etiqueta_normaliza
  before insert or update on public.tarefa_etiquetas
  for each row execute function public.tarefa_etiqueta_normaliza();

create or replace function public.tarefa_card_reconciliar_etiquetas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  destino uuid;
  saiu text := '';
begin
  if new.quadro_id is not distinct from old.quadro_id then
    return new;
  end if;

  for r in
    select ce.etiqueta_id, e.nome
      from public.tarefa_card_etiquetas ce
      join public.tarefa_etiquetas e on e.id = ce.etiqueta_id
     where ce.card_id = new.id
       and e.quadro_id is not null
       and e.quadro_id <> new.quadro_id
  loop
    destino := null;
    select e2.id into destino
      from public.tarefa_etiquetas e2
     where e2.quadro_id = new.quadro_id
       and e2.nome = r.nome
     limit 1;

    delete from public.tarefa_card_etiquetas
     where card_id = new.id and etiqueta_id = r.etiqueta_id;

    if destino is not null then
      insert into public.tarefa_card_etiquetas (card_id, etiqueta_id)
      values (new.id, destino)
      on conflict do nothing;
    else
      saiu := saiu || case when saiu = '' then '' else ', ' end || r.nome;
    end if;
  end loop;

  if saiu <> '' then
    insert into public.tarefa_historico (card_id, acao, detalhe, autor_id)
    values (new.id, 'etiquetas', 'Saíram na mudança de quadro, ' || saiu, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_card_reconciliar_etiquetas on public.tarefa_cards;
create trigger trg_card_reconciliar_etiquetas
  after update of quadro_id on public.tarefa_cards
  for each row execute function public.tarefa_card_reconciliar_etiquetas();