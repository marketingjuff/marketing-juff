# CB com até 7 cores (Chakra Color)

## Objetivo
Combos e receitas passam a exibir até 7 cores. Hoje o banco já aceita qualquer quantidade — o limite de 6 é só no desenho dos cards. O card de 7 cores segue a sugestão: o dado de 6 bolinhas ganha uma bolinha extra no centro, e a faixa de baixo mostra 3 fatias na linha de cima e 4 na linha de baixo.

## O que muda

1. **Card de combo (grade de Combos de cores)**
   - Dado com 7 bolinhas: as 6 posições atuais + uma no centro.
   - Faixa de cores: linha de cima com 3 fatias, linha de baixo com 4 fatias, todas com a mesma altura das demais.

2. **Card de receita (ficha da estampa)**
   - Mesmo tratamento: 7 bolinhas no dado e fatias 3 + 4 na faixa.

3. **Seletor de CB (na ficha da estampa)**
   - As bolinhas de prévia de cada combo passam a mostrar até 7 cores (hoje corta em 6).

4. **Simulação**
   - Antes de mexer nos dados reais, confirmo o desenho com você: abro a tela de combos no navegador com um card temporário de 7 cores (ex.: Chakra Color) para você ver o resultado. Se aprovado, o combo Chakra Color pode ser criado de verdade com as 7 cores.

## Detalhes técnicos
- Tudo em `src/components/biblioteca/EstampaVisual.tsx`: adicionar `FACE_DADO[7]` (6 posições + centro) e `FATIAS_CARD[7]` (`[3, 3, 3, 3]` em grade de 12 colunas: 3 fatias de 4 colunas em cima, 4 fatias de 3 colunas embaixo), e trocar os `slice(0, 6)` / `Math.min(..., 6)` por 7.
- `src/routes/_authenticated/biblioteca/catalogo-estampas.tsx`: prévia do seletor de CB passa de 6 para 7 bolinhas.
- Nenhuma migration: a função `biblioteca_combo_registrar` e a tabela `biblioteca_combo_itens` não têm limite de itens.
- Nada muda para combos de 1 a 6 cores — desenhos atuais preservados.
