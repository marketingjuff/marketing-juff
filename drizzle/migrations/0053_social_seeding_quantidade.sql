ALTER TABLE public.social_seeding_pecas ADD COLUMN IF NOT EXISTS quantidade integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.social_seeding_pecas.quantidade IS 'Peças iguais nesta linha (bloco para a mesma pessoa). Padrão 1.';

CREATE OR REPLACE FUNCTION public.social_seeding_pecas_normaliza()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not new.retorna then new.devolvida := false; end if;
  new.pessoa := nullif(btrim(coalesce(new.pessoa, '')), '');
  new.quantidade := greatest(coalesce(new.quantidade, 1), 1);
  new.updated_at := now();
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.social_seeding_painel(p_de date, p_ate date)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with p as (
    select pc.quantidade, pc.enviada, pc.captada, pc.retorna, pc.devolvida, pc.pessoa, r.mes
    from public.social_seeding_pecas pc join public.social_seeding_remessas r on r.id = pc.remessa_id
    where r.mes between date_trunc('month', p_de)::date and date_trunc('month', p_ate)::date
  ), custo as (select mes, public.social_seeding_custo_do_mes(mes) v from (select distinct mes from p) m)
  select json_build_object(
    'total', (select coalesce(sum(quantidade), 0) from p),
    'custo', (select coalesce(sum(p.quantidade * c.v), 0) from p join custo c using (mes)),
    'aguardando', (select coalesce(sum(quantidade), 0) from p where enviada and not captada),
    'retorna', (select coalesce(sum(quantidade), 0) from p where retorna),
    'a_devolver', (select coalesce(sum(quantidade), 0) from p where retorna and not devolvida),
    'pessoas', coalesce((select json_agg(json_build_object('pessoa', pessoa, 'qtd', qtd) order by qtd desc, pessoa)
       from (select pessoa, sum(quantidade) qtd from p where pessoa is not null and ((enviada and not captada) or (retorna and not devolvida)) group by pessoa) x), '[]'::json)
  )
$function$;