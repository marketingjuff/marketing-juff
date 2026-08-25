ALTER TABLE public.story_frames
  ADD COLUMN IF NOT EXISTS nome_arquivo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS texto_principal text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS observacao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recurso text NOT NULL DEFAULT 'Nenhum';

ALTER TABLE public.story_frames
  ADD CONSTRAINT story_frames_recurso_check
  CHECK (recurso IN ('Nenhum','Link','Enquete','Menção','Slider','Caixa de pergunta'));

CREATE TABLE public.story_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_sequences TO authenticated;
GRANT ALL ON public.story_sequences TO service_role;

ALTER TABLE public.story_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_sequences_select ON public.story_sequences
  FOR SELECT TO authenticated USING (has_permission('social.stories'));
CREATE POLICY story_sequences_insert ON public.story_sequences
  FOR INSERT TO authenticated WITH CHECK (can_edit('social.stories'));
CREATE POLICY story_sequences_update ON public.story_sequences
  FOR UPDATE TO authenticated USING (can_edit('social.stories')) WITH CHECK (can_edit('social.stories'));
CREATE POLICY story_sequences_delete ON public.story_sequences
  FOR DELETE TO authenticated USING (can_edit('social.stories'));

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS nome_bloco text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sequence_id uuid REFERENCES public.story_sequences(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS stories_sequence_id_idx ON public.stories (sequence_id);