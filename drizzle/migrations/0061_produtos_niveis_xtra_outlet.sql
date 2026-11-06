alter table public.biblioteca_produtos
  add column if not exists xtra_modelo   boolean not null default false,
  add column if not exists xtra_loja     boolean not null default false,
  add column if not exists outlet_modelo boolean not null default false,
  add column if not exists outlet_loja   boolean not null default false;