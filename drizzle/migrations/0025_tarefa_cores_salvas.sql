create table public.tarefa_cores_salvas (
  id uuid primary key default gen_random_uuid(),
  hex text not null,
  posicao integer not null,
  criado_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index tarefa_cores_salvas_hex_key on public.tarefa_cores_salvas (hex);

alter table public.tarefa_cores_salvas
  add constraint tarefa_cores_salvas_hex_formato check (hex ~ '^#[0-9a-f]{6}$');

grant select, insert, delete on public.tarefa_cores_salvas to authenticated;
grant all on public.tarefa_cores_salvas to service_role;

alter table public.tarefa_cores_salvas enable row level security;

create policy "cores salvas visiveis para autenticados"
  on public.tarefa_cores_salvas
  for select
  to authenticated
  using (true);

create policy "qualquer autenticado salva cor"
  on public.tarefa_cores_salvas
  for insert
  to authenticated
  with check (true);

create policy "qualquer autenticado remove cor"
  on public.tarefa_cores_salvas
  for delete
  to authenticated
  using (true);