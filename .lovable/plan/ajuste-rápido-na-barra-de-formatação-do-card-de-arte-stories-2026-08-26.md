Ajuste rápido na barra de formatação do card de arte (Stories).

Objetivo

Adicionar, ao lado do botão "T" de fonte, um ícone que abre um dropdown/popover listando as pré-formatações de texto já salvas no sistema. Ao clicar numa pré-formatação, o card aplica de uma só vez: fonte, peso, tamanho, alinhamento, cor do texto, cor da sombra e opacidade da sombra.

Escopo

- Remover o ícone de seta (>) recém-colocado junto ao botão "T"; o "T" volta a ser apenas o controle de fonte original.
- Criar um novo botão justaposto ao "T" com ícone que indique "pré-formatações salvas" (ex.: camadas/lista).
- Ao clicar nesse novo botão, exibir um menu suspenso compacto com os presets de `story_text_presets`, mostrando nome e uma amostra visual (cor do texto).
- Clicar num item do menu aplica a composição completa no frame via `onAplicar`.
- Se não houver presets salvos, mostrar mensagem "Nenhuma pré-formatação salva" no menu.

Arquivos envolvidos

- `src/components/stories/ArteEditor.tsx` — barra rápida `FileiraPresets`.

Não mexe em

- Exportação de PDF, roteiro, Word, importação, editor visual, banco de dados.
