ALTER TABLE public.story_sequences ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS descartado boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS stories_sequence_id_idx ON public.stories(sequence_id);
CREATE INDEX IF NOT EXISTS stories_descartado_idx ON public.stories(descartado);