create table if not exists public.app_config (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
grant select, insert, update on public.app_config to authenticated;
grant all on public.app_config to service_role;
alter table public.app_config enable row level security;
drop policy if exists app_config_todos_leem on public.app_config;
create policy app_config_todos_leem on public.app_config for select to authenticated using (auth.uid() is not null);
drop policy if exists app_config_gestao_insere on public.app_config;
create policy app_config_gestao_insere on public.app_config for insert to authenticated with check (has_role('admin'::app_role) or has_role('gestor'::app_role));
drop policy if exists app_config_gestao_atualiza on public.app_config;
create policy app_config_gestao_atualiza on public.app_config for update to authenticated using (has_role('admin'::app_role) or has_role('gestor'::app_role)) with check (has_role('admin'::app_role) or has_role('gestor'::app_role));
insert into public.app_config (chave, valor) values ('calendario_dias_faixa_topo', '20') on conflict (chave) do nothing;