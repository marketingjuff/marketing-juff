ALTER TABLE public.stories
  ADD COLUMN objective_id uuid REFERENCES public.story_objectives(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stories_objective_id_idx ON public.stories(objective_id);