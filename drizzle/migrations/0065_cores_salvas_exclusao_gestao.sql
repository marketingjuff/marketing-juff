DROP POLICY IF EXISTS "qualquer autenticado remove cor" ON public.tarefa_cores_salvas;
DROP POLICY IF EXISTS "cores salvas gestao remove" ON public.tarefa_cores_salvas;
CREATE POLICY "cores salvas gestao remove" ON public.tarefa_cores_salvas FOR DELETE TO authenticated USING (public.has_role('admin') OR public.has_role('gestor'));