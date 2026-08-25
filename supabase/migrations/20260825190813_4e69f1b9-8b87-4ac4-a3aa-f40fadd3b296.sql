REVOKE ALL ON FUNCTION public.has_role(public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_edit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_guard_self_update() FROM PUBLIC, anon, authenticated;