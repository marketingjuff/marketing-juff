CREATE OR REPLACE FUNCTION public.pode_mexer_card(_card_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tarefa_cards c
     WHERE c.id = _card_id
       AND public.pode_ver_quadro(c.quadro_id)
       AND public.can_edit('tarefas.quadros')
  )
$function$;