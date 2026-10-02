alter table public.tarefa_cards add column if not exists cor text;
do $$
declare t text;
begin
  foreach t in array array['tarefa_cards','tarefa_comentarios','tarefa_historico','tarefa_card_etiquetas'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;