# Texto da arte: 1 clique move, 2 cliques edita

## Comportamento desejado

- **1 clique (ou clique e arrasta) no texto**: seleciona a caixa de texto e permite mover a posição dela dentro da arte, com o efeito ímã da grade já existente.
- **2 cliques**: entra no modo de edição, cursor dentro da caixa, digitação normal. Sai da edição ao clicar fora ou apertar Esc.
- **Nunca** arrastar a foto/miniatura ao clicar no texto — o arraste do card é bloqueado enquanto se interage com o texto.

## O que muda na tela

- A caixa de texto ganha dois estados visuais: contorno tracejado quando está apenas selecionada (modo mover, cursor de mover) e contorno cheio quando está em edição (cursor de texto).
- A alça de mover (ícone atual no canto) deixa de ser obrigatória: o corpo inteiro do texto passa a arrastar. A alça é mantida como referência visual quando a caixa está selecionada.
- Enquanto em modo mover, o texto não é selecionável (evita seleção de palavras acidental durante o arraste).

## Detalhes técnicos

Arquivo: `src/components/stories/ArteEditor.tsx`

- `TextoEditavel` passa a ter estado `modo: "parado" | "movendo" | "editando"`.
  - `contentEditable` só fica `true` quando `modo === "editando"`; nos demais estados fica `false`, o que elimina a seleção nativa e o drag de imagem do navegador.
  - `onPointerDown` (quando não está editando): chama `iniciarArraste` do componente `Camada`, com `preventDefault` para impedir drag nativo e `stopPropagation` para impedir o dnd-kit do card.
  - `onDoubleClick`: entra em `editando`, foca o elemento e posiciona o cursor no ponto clicado (`caretPositionFromPoint`/`caretRangeFromPoint`, com fallback para fim do texto).
  - `onBlur` e `Escape`: salvam o texto (fluxo de salvamento atual inalterado) e voltam para `parado`.
- `Camada` deixa de precisar de `arrasteSoPelaAlca` para o texto: o arraste é iniciado pelo próprio corpo, mas apenas quando não está em modo edição.
- Adicionar `draggable={false}` e `onDragStart` bloqueado na camada de texto e na imagem de fundo do card, para acabar com o efeito de "arrastar a foto" mostrado no print.
- Sem mudanças no banco, no PDF, no export de imagens ou nas barras de formatação.
