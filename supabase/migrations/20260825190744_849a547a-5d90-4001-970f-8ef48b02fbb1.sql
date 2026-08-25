-- 1) Drop policies that depend on the old parameterized functions
DROP POLICY IF EXISTS stories_select ON public.stories;
DROP POLICY IF EXISTS stories_insert ON public.stories;
DROP POLICY IF EXISTS stories_update ON public.stories;
DROP POLICY IF EXISTS stories_delete ON public.stories;
DROP POLICY IF EXISTS story_frames_select ON public.story_frames;
DROP POLICY IF EXISTS story_frames_insert ON public.story_frames;
DROP POLICY IF EXISTS story_frames_update ON public.story_frames;
DROP POLICY IF EXISTS story_frames_delete ON public.story_frames;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS stories_bucket_select ON storage.objects;
DROP POLICY IF EXISTS stories_bucket_insert ON storage.objects;
DROP POLICY IF EXISTS stories_bucket_delete ON storage.objects;

DROP FUNCTION IF EXISTS public.has_permission(uuid, text);
DROP FUNCTION IF EXISTS public.can_edit(uuid, text);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2) Recreate them without an external user id: always the current session user
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.permissions && ARRAY[_perm, _perm || ':leitura'])
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.permissions @> ARRAY[_perm])
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit(text) TO authenticated;

-- 3) Recreate stories policies
CREATE POLICY stories_select ON public.stories FOR SELECT TO authenticated
  USING (public.has_permission('social.stories'));
CREATE POLICY stories_insert ON public.stories FOR INSERT TO authenticated
  WITH CHECK (public.can_edit('social.stories'));
CREATE POLICY stories_update ON public.stories FOR UPDATE TO authenticated
  USING (public.can_edit('social.stories')) WITH CHECK (public.can_edit('social.stories'));
CREATE POLICY stories_delete ON public.stories FOR DELETE TO authenticated
  USING (public.can_edit('social.stories'));

CREATE POLICY story_frames_select ON public.story_frames FOR SELECT TO authenticated
  USING (public.has_permission('social.stories'));
CREATE POLICY story_frames_insert ON public.story_frames FOR INSERT TO authenticated
  WITH CHECK (public.can_edit('social.stories'));
CREATE POLICY story_frames_update ON public.story_frames FOR UPDATE TO authenticated
  USING (public.can_edit('social.stories')) WITH CHECK (public.can_edit('social.stories'));
CREATE POLICY story_frames_delete ON public.story_frames FOR DELETE TO authenticated
  USING (public.can_edit('social.stories'));

-- 4) Storage policies for the stories bucket
CREATE POLICY stories_bucket_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stories' AND public.has_permission('social.stories'));
CREATE POLICY stories_bucket_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND public.can_edit('social.stories'));
CREATE POLICY stories_bucket_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND public.can_edit('social.stories'));

-- 5) Profiles: read own + admin reads all
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role('admin'));

-- 6) Profiles: update only own row (no INSERT/DELETE policies for regular users)
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Column-level privileges: regular users may only touch nome / must_change_password
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nome, must_change_password) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Defense in depth: block privilege/identity changes coming from a normal user session
CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / admin server-side path
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Apenas o administrador pode alterar papel, permissoes ou e-mail';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_self_update ON public.profiles;
CREATE TRIGGER profiles_guard_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_self_update();