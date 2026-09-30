alter table public.meudia_recorrentes add column if not exists encerrado_em date;

create table if not exists public.meudia_excecoes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorrente_id uuid not null references public.meudia_recorrentes(id) on delete cascade,
  data date not null,
  primary key (user_id, recorrente_id, data)
);

grant select, insert, update, delete on public.meudia_excecoes to authenticated;
grant all on public.meudia_excecoes to service_role;

alter table public.meudia_excecoes enable row level security;

drop policy if exists "meudia_excecoes_minhas" on public.meudia_excecoes;
create policy "meudia_excecoes_minhas" on public.meudia_excecoes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());