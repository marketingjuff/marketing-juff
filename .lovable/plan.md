# Corrigir o ajuste de largura da caixa de texto

As alças laterais já existem no código, mas somem antes de você conseguir clicar nelas: quem controla a exibição é o próprio texto (`onMouseEnter`/`onMouseLeave` no bloco de texto). Como as alças ficam nas bordas, para fora do texto, ao levar o mouse até elas o ponteiro sai do texto, o estado de "sobre" volta a falso e as alças desaparecem no mesmo instante. O arraste nunca começa.

## O que muda

1. **Área de hover correta**
   Envolver texto e alças em um mesmo contêiner que controla o hover. Assim as alças continuam visíveis enquanto o mouse estiver sobre elas, e também durante todo o arraste.

2. **Alças mais fáceis de pegar**
   Área de clique maior (faixa vertical na altura toda da caixa, com um pino visível no meio), cursor de redimensionar e captura do ponteiro para o arraste não se perder ao sair da imagem.

3. **Controle numérico como alternativa**
   No painel de formatação do texto, um controle "Largura da caixa" (10% a 100%) para ajustar sem arrastar — útil em telas pequenas e para repetir o mesmo valor em várias artes.

4. **Confirmar que o valor persiste**
   Após ajustar, a largura é salva na arte e reaplicada ao recarregar; a quebra de linha do preview e da exportação (PNG/PDF) segue a mesma largura.

## Detalhes técnicos

- `src/components/stories/ArteEditor.tsx`, componente `TextoEditavel`: novo wrapper `relative inline-block` com o estado `sobre`; alças passam a ser filhas desse wrapper; `setPointerCapture` no `pointerdown` da alça; manter alças visíveis enquanto `redimensionando` for verdadeiro.
- Slider de largura no popover de formatação, gravando `texto_largura` via `salvar({ texto_largura })`.
- Nenhuma mudança de banco: a coluna `comp_texto_largura` já existe e já é lida em `composicaoDaLinha`.
- Sem alteração na lógica de exportação, que já usa `texto_largura`.
