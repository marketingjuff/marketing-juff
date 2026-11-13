create table if not exists public.app_segredos (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);

revoke all on public.app_segredos from public, anon, authenticated;
grant all on public.app_segredos to service_role;

alter table public.app_segredos enable row level security;

drop policy if exists app_segredos_service_role on public.app_segredos;
create policy app_segredos_service_role on public.app_segredos
  for all to service_role using (true) with check (true);

insert into public.app_segredos (chave, valor)
values ('push_chave', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (chave) do nothing;

create or replace function public.push_disparar()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  quer boolean;
  chave text;
begin
  select p.push into quer from public.notificacao_preferencias p
   where p.user_id = new.user_id and p.tipo = new.tipo;
  if not coalesce(quer, new.tipo in ('card_atribuido','comentario')) then return null; end if;
  if not exists (select 1 from public.push_inscricoes i where i.user_id = new.user_id) then return null; end if;

  select s.valor into chave from public.app_segredos s where s.chave = 'push_chave';
  if chave is null then return null; end if;

  perform net.http_post(
    url := 'https://project--44ccfbf3-cd71-4f7a-ad43-5853061c829c.lovable.app/api/public/push-enviar',
    headers := jsonb_build_object('Content-Type','application/json','x-push-chave', chave),
    body := jsonb_build_object('notificacao_id', new.id)
  );
  return null;
exception when others then return null;
end; $$;

drop trigger if exists trg_push_disparar on public.notificacoes;
create trigger trg_push_disparar after insert on public.notificacoes
  for each row execute function public.push_disparar();

drop policy if exists "cores salvas visiveis para autenticados" on public.tarefa_cores_salvas;
create policy "cores salvas visiveis para autenticados" on public.tarefa_cores_salvas
  for select to authenticated
  using (public.has_permission('tarefas.quadros'));

drop policy if exists "qualquer autenticado salva cor" on public.tarefa_cores_salvas;
create policy "qualquer autenticado salva cor" on public.tarefa_cores_salvas
  for insert to authenticated
  with check (public.can_edit('tarefas.quadros'));

drop policy if exists "ctas_select" on public.story_ctas;
create policy "ctas_select" on public.story_ctas
  for select to authenticated
  using (public.has_permission('social.stories'));

drop policy if exists "story_links_select" on public.story_links;
create policy "story_links_select" on public.story_links
  for select to authenticated
  using (public.has_permission('social.stories'));

drop policy if exists "objectives_select" on public.story_objectives;
create policy "objectives_select" on public.story_objectives
  for select to authenticated
  using (public.has_permission('social.stories'));

drop policy if exists "presets leitura autenticada" on public.story_text_presets;
create policy "presets leitura autenticada" on public.story_text_presets
  for select to authenticated
  using (public.has_permission('social.stories'));

drop policy if exists app_config_todos_leem on public.app_config;
create policy app_config_todos_leem on public.app_config
  for select to authenticated
  using (
    public.has_permission('tarefas.quadros')
    or public.has_permission('tarefas.calendario')
    or public.has_role('admin'::app_role)
    or public.has_role('gestor'::app_role)
  );