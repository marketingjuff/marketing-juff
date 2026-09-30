create table public.atalhos_paginas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  destino text not null,
  label text not null,
  posicao integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, destino)
);
grant select, insert, update, delete on public.atalhos_paginas to authenticated;
grant all on public.atalhos_paginas to service_role;
alter table public.atalhos_paginas enable row level security;
create policy "atalhos_paginas_meus" on public.atalhos_paginas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());