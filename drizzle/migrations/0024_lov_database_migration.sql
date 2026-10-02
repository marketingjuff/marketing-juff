ALTER TABLE public.tarefa_cards ADD COLUMN cor_fundo text;

COMMENT ON COLUMN public.tarefa_cards.cor_fundo IS 'Cor hexadecimal do fundo do card; null = fundo neutro padrao';