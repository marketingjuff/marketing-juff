alter table public.atalhos_paginas
  add column if not exists quadro_id uuid references public.tarefa_quadros(id) on delete cascade;
alter table public.atalhos_paginas alter column destino drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'atalhos_paginas_destino_ou_quadro') then
    alter table public.atalhos_paginas
      add constraint atalhos_paginas_destino_ou_quadro check (num_nonnulls(destino, quadro_id) = 1);
  end if;
end $$;
create unique index if not exists atalhos_paginas_user_quadro_uniq
  on public.atalhos_paginas (user_id, quadro_id) where quadro_id is not null;
create or replace function public.reordenar_atalhos(p_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.atalhos_paginas a
     set posicao = nova.ordem
    from (select id, (ordinality - 1)::int as ordem from unnest(p_ids) with ordinality as t(id, ordinality)) as nova
   where a.id = nova.id and a.user_id = auth.uid();
end $$;
comment on column public.tarefa_quadro_atalhos.fixado is 'DEPRECATED: a barra de atalhos não usa mais esta coluna';