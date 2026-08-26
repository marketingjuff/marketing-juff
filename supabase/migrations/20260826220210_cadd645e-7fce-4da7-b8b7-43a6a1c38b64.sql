INSERT INTO public.story_text_presets (nome, fonte, peso, tamanho, alinhamento, cor_texto, cor_sombra, opacidade_sombra)
SELECT v.nome, v.fonte, v.peso, 5, v.alinhamento, '#ffffff', '#000000', 15
FROM (VALUES
 ('Google Regular Esquerda','Google Sans Flex',400,'left'),
 ('Google Regular Centro','Google Sans Flex',400,'center'),
 ('Google Regular Direita','Google Sans Flex',400,'right'),
 ('Google Negrito Esquerda','Google Sans Flex',700,'left'),
 ('Google Negrito Centro','Google Sans Flex',700,'center'),
 ('Google Negrito Direita','Google Sans Flex',700,'right'),
 ('Nunito Regular Esquerda','Nunito',400,'left'),
 ('Nunito Regular Centro','Nunito',400,'center'),
 ('Nunito Regular Direita','Nunito',400,'right'),
 ('Nunito Negrito Esquerda','Nunito',700,'left'),
 ('Nunito Negrito Centro','Nunito',700,'center'),
 ('Nunito Negrito Direita','Nunito',700,'right')
) AS v(nome, fonte, peso, alinhamento)
WHERE NOT EXISTS (
  SELECT 1 FROM public.story_text_presets p WHERE p.nome = v.nome
);