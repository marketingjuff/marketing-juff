UPDATE public.story_frames
SET comp_texto_fonte = 'Google Sans Flex',
    comp_texto_peso = 400,
    comp_texto_tamanho = 5,
    comp_texto_alinhamento = 'left'
WHERE comp_texto_fonte IS NULL
   OR (comp_texto_fonte = 'Nunito'
       AND comp_texto_peso = 900
       AND comp_texto_tamanho = 6
       AND comp_texto_alinhamento = 'center');