alter table public.tarefa_comentarios add column if not exists editado_em timestamptz;
create or replace function public.tarefa_comentario_marca_edicao()
returns trigger language plpgsql as $$
begin
  if new.texto is distinct from old.texto then
    new.editado_em = now();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_tarefa_comentario_marca_edicao on public.tarefa_comentarios;
create trigger trg_tarefa_comentario_marca_edicao before update on public.tarefa_comentarios for each row execute function public.tarefa_comentario_marca_edicao();
drop policy if exists "comentarios_update" on public.tarefa_comentarios;
drop policy if exists "tarefa_comentarios_update_autor" on public.tarefa_comentarios;
create policy "tarefa_comentarios_update_autor" on public.tarefa_comentarios for update to authenticated using (autor_id = auth.uid()) with check (autor_id = auth.uid());
create or replace function public.texto_limpo(entrada text)
returns text language sql immutable as $$
  select btrim(regexp_replace(replace(replace(replace(replace(replace(regexp_replace(coalesce(entrada, ''), '<[^>]*>', ' ', 'g'), '&nbsp;', ' '), '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '\s+', ' ', 'g'));
$$;