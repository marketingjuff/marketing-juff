ALTER TABLE public.story_links ADD COLUMN IF NOT EXISTS ordem integer;

WITH numerado AS (
  SELECT id, row_number() OVER (ORDER BY nome, id) AS nova_ordem
  FROM public.story_links
)
UPDATE public.story_links l
SET ordem = n.nova_ordem
FROM numerado n
WHERE n.id = l.id;

UPDATE public.story_links SET ordem = 0 WHERE ordem IS NULL;
ALTER TABLE public.story_links ALTER COLUMN ordem SET DEFAULT 0;
ALTER TABLE public.story_links ALTER COLUMN ordem SET NOT NULL;