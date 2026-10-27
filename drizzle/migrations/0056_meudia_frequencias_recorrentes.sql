ALTER TABLE public.meudia_recorrentes
  ADD COLUMN frequencia text,
  ADD COLUMN intervalo_dias integer NOT NULL DEFAULT 1,
  ADD COLUMN inicio_em date,
  ADD COLUMN dia_mes integer NOT NULL DEFAULT 1,
  ADD COLUMN dia_util integer NOT NULL DEFAULT 1;
ALTER TABLE public.meudia_recorrentes
  ADD CONSTRAINT meudia_recorrentes_frequencia_check CHECK (frequencia IS NULL OR frequencia IN ('livre', 'diaria', 'semanal', 'quinzenal', 'intervalo', 'mensal', 'dia_util', 'ultimo_dia_util')),
  ADD CONSTRAINT meudia_recorrentes_intervalo_check CHECK (intervalo_dias >= 1),
  ADD CONSTRAINT meudia_recorrentes_dia_mes_check CHECK (dia_mes BETWEEN 1 AND 31),
  ADD CONSTRAINT meudia_recorrentes_dia_util_check CHECK (dia_util BETWEEN 1 AND 23);
COMMENT ON COLUMN public.meudia_recorrentes.frequencia IS 'NULL preserves legacy dia_semana recurrence; non-NULL uses the expanded Meu dia recurrence rule.';