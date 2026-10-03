alter table public.biblioteca_estampas add column if not exists tipo text not null default 'codigo';
alter table public.biblioteca_estampas drop constraint if exists biblioteca_estampas_tipo_ck;
alter table public.biblioteca_estampas add constraint biblioteca_estampas_tipo_ck check (tipo in ('codigo','cromia'));

alter table public.biblioteca_estampa_receitas add column if not exists publico text;
alter table public.biblioteca_estampa_receitas drop constraint if exists biblioteca_estampa_receitas_publico_ck;
alter table public.biblioteca_estampa_receitas add constraint biblioteca_estampa_receitas_publico_ck
  check (publico is null or publico in ('menino','menina'));

create table if not exists public.biblioteca_carga_log (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  relatorio jsonb not null,
  criado_em timestamptz not null default now()
);
grant select on public.biblioteca_carga_log to authenticated;
grant all on public.biblioteca_carga_log to service_role;
alter table public.biblioteca_carga_log enable row level security;
drop policy if exists biblioteca_carga_log_sel on public.biblioteca_carga_log;
create policy biblioteca_carga_log_sel on public.biblioteca_carga_log for select to authenticated
  using (public.has_role('admin'));

create or replace function public.biblioteca_norm(t text)
returns text language sql immutable set search_path = public as $$
  select regexp_replace(lower(trim(translate(coalesce(t,''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))), '\s+', ' ', 'g')
$$;

create or replace function public.biblioteca_carga_cor(t text)
returns uuid language sql stable security definer set search_path = public as $$
  with n as (select public.biblioteca_norm(t) as v),
  alvo as (
    select v from n
    union select case v when 'verde menta' then 'menta' when 'azul indigo' then 'indigo'
                        when 'roial' then 'royal' else v end from n
  )
  select c.id from public.biblioteca_cores c
   where public.biblioteca_norm(c.nome) in (select v from alvo)
      or public.biblioteca_norm(c.nome_olist) in (select v from alvo)
   order by c.ativo desc, c.posicao
   limit 1
$$;

create or replace function public.biblioteca_carga_fichas(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_est jsonb; v_grp jsonb; v_rec jsonb; v_txt text;
  v_est_id uuid; v_grp_id uuid; v_cor_id uuid; v_combo uuid; v_rec_id uuid;
  v_itens jsonb; v_assin text; v_gen text; v_modelos text[]; v_parts text[];
  v_ord int; v_c int; v_m int; v_y int; v_k int;
  f_cores text[] := '{}'; f_pend text[] := '{}'; f_modelos text[] := '{}';
  n_est_nova int := 0; n_est_exist int := 0; n_rec int := 0; n_rec_exist int := 0; n_combo int := 0;
begin
  for v_est in select x from jsonb_array_elements(p) as t(x) loop
    select id into v_est_id from public.biblioteca_estampas where lower(nome) = lower(v_est->>'n');
    if v_est_id is null then
      insert into public.biblioteca_estampas (nome, situacao, tipo, posicao)
      values (v_est->>'n', 'ativo', v_est->>'t',
              coalesce((select max(posicao) from public.biblioteca_estampas), 0) + 1)
      returning id into v_est_id;
      n_est_nova := n_est_nova + 1;
    else
      n_est_exist := n_est_exist + 1;
      if v_est->>'t' = 'cromia' then
        update public.biblioteca_estampas set tipo = 'cromia' where id = v_est_id;
      end if;
    end if;

    for v_ord in 1..coalesce((v_est->>'p')::int, 0) loop
      insert into public.biblioteca_estampa_papeis (estampa_id, ordem, nome)
      values (v_est_id, v_ord, '') on conflict (estampa_id, ordem) do nothing;
    end loop;

    for v_txt in select jsonb_array_elements_text(v_est->'c') loop
      v_cor_id := public.biblioteca_carga_cor(v_txt);
      if v_cor_id is null then
        f_cores := array_append(f_cores, (v_est->>'n') || ' ' || v_txt);
        continue;
      end if;
      insert into public.biblioteca_estampa_cores_camiseta (estampa_id, cor_id, posicao)
      values (v_est_id, v_cor_id,
              coalesce((select max(posicao) + 1 from public.biblioteca_estampa_cores_camiseta where estampa_id = v_est_id), 0))
      on conflict do nothing;
    end loop;

    for v_grp in select x from jsonb_array_elements(v_est->'g') as t(x) loop
      select id into v_grp_id from public.biblioteca_estampa_grupos
       where estampa_id = v_est_id and lower(nome) = lower(v_grp->>'n');
      if v_grp_id is null then
        insert into public.biblioteca_estampa_grupos (estampa_id, nome, posicao)
        values (v_est_id, v_grp->>'n',
                (select count(*) from public.biblioteca_estampa_grupos where estampa_id = v_est_id))
        returning id into v_grp_id;
      end if;

      v_modelos := case v_grp->>'m'
        when 'M' then array['camiseta','regata masculina','ml masculina','manga longa masculina']
        when 'F' then array['baby look','regata feminina','ml feminina','manga longa feminina']
        else array['camiseta infantil','ml infantil','manga longa infantil'] end;
      insert into public.biblioteca_estampa_grupo_modelos (estampa_id, grupo_id, produto_id)
      select v_est_id, v_grp_id, pr.id from public.biblioteca_produtos pr
       where public.biblioteca_norm(pr.nome_base) = any (v_modelos)
      on conflict do nothing;

      v_gen := case v_grp->>'m' when 'F' then 'feminino' when 'I' then 'infantil' else 'masculino' end;

      for v_rec in select x from jsonb_array_elements(v_grp->'r') as t(x) loop
        if jsonb_array_length(v_rec->2) = 0 then continue; end if;
        v_cor_id := public.biblioteca_carga_cor(v_rec->>0);
        if v_cor_id is null then continue; end if;
        if exists (select 1 from public.biblioteca_estampa_receitas where grupo_id = v_grp_id and cor_id = v_cor_id) then
          n_rec_exist := n_rec_exist + 1;
          continue;
        end if;

        v_itens := '[]'::jsonb;
        for v_txt in select jsonb_array_elements_text(v_rec->2) loop
          v_parts := string_to_array(v_txt, '@');
          select c, m, y, k into v_c, v_m, v_y, v_k
            from public.biblioteca_estampa_cores where upper(codigo) = upper(v_parts[1]) limit 1;
          if not found then
            if array_length(v_parts, 1) > 1 then
              v_c := split_part(v_parts[2], '.', 1)::int; v_m := split_part(v_parts[2], '.', 2)::int;
              v_y := split_part(v_parts[2], '.', 3)::int; v_k := split_part(v_parts[2], '.', 4)::int;
            else
              v_c := 0; v_m := 0; v_y := 0; v_k := 0;
            end if;
            if not ((v_est->>'n') || ' ' || v_parts[1]) = any (f_pend) then
              f_pend := array_append(f_pend, (v_est->>'n') || ' ' || v_parts[1]);
            end if;
          end if;
          v_itens := v_itens || jsonb_build_array(jsonb_build_object(
            'codigo', v_parts[1], 'c', v_c, 'm', v_m, 'y', v_y, 'k', v_k));
        end loop;

        select string_agg(upper(x->>'codigo'), '|' order by o) into v_assin
          from jsonb_array_elements(v_itens) with ordinality as t(x, o);
        v_combo := null;
        select cb.id into v_combo from public.biblioteca_combos cb
         where cb.genero = v_gen and cb.cor_id is not distinct from v_cor_id
           and (select string_agg(upper(ci.codigo), '|' order by ci.ordem)
                  from public.biblioteca_combo_itens ci where ci.combo_id = cb.id) = v_assin
         limit 1;
        if v_combo is null then
          insert into public.biblioteca_combos (codigo, genero, cor_id, posicao)
          values (public.biblioteca_proximo_codigo_combo(), v_gen, v_cor_id,
                  coalesce((select max(posicao) from public.biblioteca_combos), 0) + 1)
          returning id into v_combo;
          insert into public.biblioteca_combo_itens (combo_id, ordem, codigo, c, m, y, k)
          select v_combo, o, x->>'codigo', (x->>'c')::int, (x->>'m')::int, (x->>'y')::int, (x->>'k')::int
            from jsonb_array_elements(v_itens) with ordinality as t(x, o);
          n_combo := n_combo + 1;
        end if;

        insert into public.biblioteca_estampa_receitas (estampa_id, grupo_id, cor_id, combo_id, publico)
        values (v_est_id, v_grp_id, v_cor_id, v_combo, nullif(v_rec->>1, ''))
        returning id into v_rec_id;
        insert into public.biblioteca_estampa_receita_itens (receita_id, ordem, codigo, c, m, y, k)
        select v_rec_id, o, x->>'codigo', (x->>'c')::int, (x->>'m')::int, (x->>'y')::int, (x->>'k')::int
          from jsonb_array_elements(v_itens) with ordinality as t(x, o);
        n_rec := n_rec + 1;
      end loop;
    end loop;
  end loop;

  select coalesce(array_agg(nm), '{}') into f_modelos
    from unnest(array['camiseta','regata masculina','ml masculina|manga longa masculina','baby look',
                      'regata feminina','ml feminina|manga longa feminina','camiseta infantil',
                      'ml infantil|manga longa infantil']) as nm
   where not exists (select 1 from public.biblioteca_produtos pr
                      where public.biblioteca_norm(pr.nome_base) = any (string_to_array(nm, '|')));

  return jsonb_build_object(
    'estampas_novas', n_est_nova, 'estampas_ja_existiam', n_est_exist,
    'receitas_novas', n_rec, 'receitas_ja_existiam_preservadas', n_rec_exist,
    'combos_novos', n_combo,
    'cores_de_camiseta_nao_encontradas', to_jsonb(f_cores),
    'modelos_nao_encontrados', to_jsonb(f_modelos),
    'codigos_fora_da_cartela', to_jsonb(f_pend));
end;
$$;

revoke execute on function public.biblioteca_carga_fichas(jsonb) from public, anon, authenticated;
revoke execute on function public.biblioteca_carga_cor(text) from public, anon, authenticated;
grant execute on function public.biblioteca_carga_fichas(jsonb) to service_role;
grant execute on function public.biblioteca_carga_cor(text) to service_role;
grant execute on function public.biblioteca_norm(text) to authenticated, service_role;