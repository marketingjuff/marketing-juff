alter table public.profiles
  add column if not exists sigla text,
  add column if not exists cor_avatar text,
  add column if not exists cor_texto_avatar text;

comment on column public.profiles.sigla is 'Ate 3 caracteres mostrados na bolinha do responsavel. Nulo usa derivacao automatica do nome.';
comment on column public.profiles.cor_avatar is 'Cor de fundo da bolinha, hexadecimal com cerquilha e seis digitos. Nulo usa a cor primaria do tema.';
comment on column public.profiles.cor_texto_avatar is 'Cor do texto da bolinha, hexadecimal com cerquilha e seis digitos. Nulo usa a cor de contraste do tema.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_sigla_formato') then
    alter table public.profiles add constraint profiles_sigla_formato check (sigla is null or sigla ~ '^[A-Z0-9]{1,3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_cor_avatar_formato') then
    alter table public.profiles add constraint profiles_cor_avatar_formato check (cor_avatar is null or cor_avatar ~ '^#[0-9a-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_cor_texto_avatar_formato') then
    alter table public.profiles add constraint profiles_cor_texto_avatar_formato check (cor_texto_avatar is null or cor_texto_avatar ~ '^#[0-9a-f]{6}$');
  end if;
end $$;