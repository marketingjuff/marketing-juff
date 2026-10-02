create extension if not exists pg_net with schema extensions;

create table if not exists public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  navegador text not null default '',
  created_at timestamptz not null default now(),
  ultimo_envio timestamptz,
  falhas int not null default 0
);
create index if not exists push_inscricoes_user_idx on public.push_inscricoes (user_id);
grant select, insert, update, delete on public.push_inscricoes to authenticated;
grant all on public.push_inscricoes to service_role;
alter table public.push_inscricoes enable row level security;
drop policy if exists "push minhas inscricoes" on public.push_inscricoes;
create policy "push minhas inscricoes" on public.push_inscricoes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.notificacao_preferencias add column if not exists push boolean not null default false;
update public.notificacao_preferencias set push = true where tipo in ('card_atribuido','comentario') and push = false;

-- Marca de envio, para que cada notificação gere no máximo um push.
alter table public.notificacoes add column if not exists push_enviado_em timestamptz;

create or replace function public.push_marcar_falha(_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.push_inscricoes set falhas = falhas + 1 where id = _id;
$$;
revoke execute on function public.push_marcar_falha(uuid) from public, anon, authenticated;

create or replace function public.push_disparar()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare quer boolean;
begin
  select p.push into quer from public.notificacao_preferencias p
   where p.user_id = new.user_id and p.tipo = new.tipo;
  if not coalesce(quer, new.tipo in ('card_atribuido','comentario')) then return null; end if;
  if not exists (select 1 from public.push_inscricoes i where i.user_id = new.user_id) then return null; end if;
  perform net.http_post(
    url := 'https://project--44ccfbf3-cd71-4f7a-ad43-5853061c829c.lovable.app/api/public/push-enviar',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('notificacao_id', new.id)
  );
  return null;
exception when others then return null;
end; $$;

drop trigger if exists trg_push_disparar on public.notificacoes;
create trigger trg_push_disparar after insert on public.notificacoes
  for each row execute function public.push_disparar();