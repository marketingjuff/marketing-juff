CREATE OR REPLACE FUNCTION public.social_seeding_custo_do_mes(p_mes date)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select case when auth.uid() is not null and public.has_permission('social.seeding')
    then coalesce((select valor from public.social_seeding_custos where mes <= date_trunc('month', p_mes)::date order by mes desc limit 1), 0)
    else null end
$function$;
REVOKE EXECUTE ON FUNCTION public.social_seeding_custo_do_mes(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_seeding_custo_do_mes(date) TO authenticated;