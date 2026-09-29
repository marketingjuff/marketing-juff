ALTER TABLE public.tarefa_etiquetas
ADD COLUMN cor_texto text NOT NULL DEFAULT '#ffffff';

UPDATE public.tarefa_etiquetas
SET cor_texto = CASE
  WHEN (
    0.2126 * (get_byte(decode(substr(cor, 2, 2), 'hex'), 0) / 255.0) +
    0.7152 * (get_byte(decode(substr(cor, 4, 2), 'hex'), 0) / 255.0) +
    0.0722 * (get_byte(decode(substr(cor, 6, 2), 'hex'), 0) / 255.0)
  ) > 0.62 THEN '#111111'
  ELSE '#ffffff'
END
WHERE cor ~ '^#[0-9a-f]{6}$';