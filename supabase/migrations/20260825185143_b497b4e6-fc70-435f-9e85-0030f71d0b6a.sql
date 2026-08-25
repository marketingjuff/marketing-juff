CREATE TYPE public.app_role AS ENUM ('admin','gestor','operador');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'operador',
  permissions text[] NOT NULL DEFAULT '{}',
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND (p.role = 'admin' OR p.permissions && ARRAY[_perm, _perm || ':leitura'])
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND (p.role = 'admin' OR p.permissions @> ARRAY[_perm])
  )
$$;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  adjust_comment text,
  adjust_comment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select" ON public.stories
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'social.stories'));
CREATE POLICY "stories_insert" ON public.stories
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid(), 'social.stories'));
CREATE POLICY "stories_update" ON public.stories
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid(), 'social.stories'))
  WITH CHECK (public.can_edit(auth.uid(), 'social.stories'));
CREATE POLICY "stories_delete" ON public.stories
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid(), 'social.stories'));

CREATE TABLE public.story_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX story_frames_story_id_idx ON public.story_frames(story_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_frames TO authenticated;
GRANT ALL ON public.story_frames TO service_role;
ALTER TABLE public.story_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_frames_select" ON public.story_frames
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'social.stories'));
CREATE POLICY "story_frames_insert" ON public.story_frames
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid(), 'social.stories'));
CREATE POLICY "story_frames_update" ON public.story_frames
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid(), 'social.stories'))
  WITH CHECK (public.can_edit(auth.uid(), 'social.stories'));
CREATE POLICY "story_frames_delete" ON public.story_frames
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid(), 'social.stories'));