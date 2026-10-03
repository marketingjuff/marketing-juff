# Juntar combos de cores repetidos

## O que encontrei
Existem 1.270 combos. **316 deles repetem** outro combo do mesmo gênero com exatamente as mesmas cores de tinta (mesmos códigos e mesmo CMYK). Eles só se diferenciam pela cor da camiseta onde foram usados (ex.: o mesmo "23A" aparece como CB236 e outros). A carga das fichas criou um combo novo para cada cor de camiseta, em vez de reaproveitar o existente.

## O que vou fazer
1. Agrupar os combos iguais (mesmo gênero + mesmas tintas na mesma ordem + mesmo CMYK).
2. Em cada grupo, manter o de **número CB menor**.
3. Passar todas as estampas/receitas que usam os repetidos para o CB menor (nada se perde nas fichas das estampas — a cor da camiseta continua gravada em cada receita).
4. Apagar os combos de número maior (316).
5. Corrigir a regra de cadastro de combo para que, daqui pra frente, um combo com as mesmas tintas e gênero seja sempre reaproveitado, independente da cor da camiseta — assim não volta a duplicar.

Resultado: cerca de 954 combos, sem repetidos, e os contadores "N estampas" somados no combo que ficou.

## Detalhes técnicos
- Remapeamento: `UPDATE biblioteca_estampa_receitas SET combo_id = <menor>` para cada duplicado; depois `DELETE` em `biblioteca_combo_itens` e `biblioteca_combos` dos duplicados (via ferramenta de dados, com confirmação).
- Assinatura do grupo: `genero` + `string_agg(codigo:c/m/y/k ORDER BY ordem)`.
- Migração ajusta `biblioteca_combo_registrar` (e `biblioteca_carga_fichas`, se ele deduplicar por `cor_id`) para buscar combo existente por gênero + itens, ignorando `cor_id`.
- Combos unissex não são misturados com masculino/feminino (gênero diferente = combo diferente).
