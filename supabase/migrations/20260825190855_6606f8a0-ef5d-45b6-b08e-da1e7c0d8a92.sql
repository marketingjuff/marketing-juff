GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit(text) TO authenticated;

REVOKE INSERT, DELETE, TRUNCATE ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (nome, must_change_password) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;