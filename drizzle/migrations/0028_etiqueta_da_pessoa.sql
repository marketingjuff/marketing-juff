alter table public.tarefa_etiquetas add column if not exists pessoa_id uuid references public.profiles(id) on delete set null;
create unique index if not exists tarefa_etiquetas_pessoa_quadro_uq on public.tarefa_etiquetas (quadro_id, pessoa_id) where pessoa_id is not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tarefa_etiquetas_pessoa_exige_quadro') then
    alter table public.tarefa_etiquetas add constraint tarefa_etiquetas_pessoa_exige_quadro check (pessoa_id is null or quadro_id is not null);
  end if;
end $$;
alter table public.tarefa_quadros add column if not exists etiqueta_do_criador boolean not null default false;

create or replace function public.tarefa_card_etiqueta_do_criador()
returns trigger language plpgsql security definer set search_path = public as $$
declare liga boolean; quem uuid; etq uuid;
begin
  select q.etiqueta_do_criador into liga from public.tarefa_quadros q where q.id = new.quadro_id;
  if not coalesce(liga,false) then return null; end if;
  quem := coalesce(new.criado_por, auth.uid());
  if quem is null then return null; end if;
  select e.id into etq from public.tarefa_etiquetas e
   where e.quadro_id = new.quadro_id and e.pessoa_id = quem and e.arquivado = false limit 1;
  if etq is not null then
    insert into public.tarefa_card_etiquetas (card_id, etiqueta_id) values (new.id, etq) on conflict do nothing;
  end if;
  return null;
end; $$;
drop trigger if exists trg_card_etiqueta_do_criador on public.tarefa_cards;
create trigger trg_card_etiqueta_do_criador after insert on public.tarefa_cards
  for each row execute function public.tarefa_card_etiqueta_do_criador();