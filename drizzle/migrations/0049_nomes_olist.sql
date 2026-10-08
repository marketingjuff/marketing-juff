alter table public.biblioteca_produtos
  add column if not exists nome_base_olist text not null default '',
  add column if not exists tecido_olist    text not null default '',
  add column if not exists sufixo_olist    text not null default '';

update public.biblioteca_produtos
set
  nome_base_olist = case when nome_base_olist = '' then nome_base else nome_base_olist end,
  tecido_olist    = case when tecido_olist    = '' then tecido    else tecido_olist    end,
  sufixo_olist    = case when sufixo_olist    = '' then sufixo    else sufixo_olist    end
where nome_base_olist = '' or tecido_olist = '' or sufixo_olist = '';

create table if not exists public.biblioteca_tamanhos_olist (
  tamanho     text primary key,
  nome_olist  text not null default ''
);
grant select, insert, update, delete on public.biblioteca_tamanhos_olist to authenticated;
grant all on public.biblioteca_tamanhos_olist to service_role;
alter table public.biblioteca_tamanhos_olist enable row level security;
drop policy if exists biblioteca_tamanhos_olist_select on public.biblioteca_tamanhos_olist;
drop policy if exists biblioteca_tamanhos_olist_insert on public.biblioteca_tamanhos_olist;
drop policy if exists biblioteca_tamanhos_olist_update on public.biblioteca_tamanhos_olist;
drop policy if exists biblioteca_tamanhos_olist_delete on public.biblioteca_tamanhos_olist;
create policy biblioteca_tamanhos_olist_select on public.biblioteca_tamanhos_olist for select to authenticated using (true);
create policy biblioteca_tamanhos_olist_insert on public.biblioteca_tamanhos_olist for insert to authenticated with check (public.has_role('admin'::app_role));
create policy biblioteca_tamanhos_olist_update on public.biblioteca_tamanhos_olist for update to authenticated using (public.has_role('admin'::app_role)) with check (public.has_role('admin'::app_role));
create policy biblioteca_tamanhos_olist_delete on public.biblioteca_tamanhos_olist for delete to authenticated using (public.has_role('admin'::app_role));

insert into public.biblioteca_tamanhos_olist (tamanho, nome_olist) values
  ('PP','PP'), ('P','P'), ('M','M'), ('G','G'),
  ('GG','GG'), ('EXG','EXG'), ('EXXG','EXXG')
on conflict (tamanho) do nothing;