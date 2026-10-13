# Liberar arraste de cards durante a busca no quadro

## Contexto

Hoem, quando alguém digita na busca (ou liga "Só atrasados" / "Só os meus" / filtro de etiqueta), o arraste fica travado de propósito: `QuadroBoard.tsx` passa `dragDisabled={filtrando}` para as colunas, e isso desabilita cards e colunas enquanto o filtro está ativo.

A pedido: arrastar cards deve funcionar mesmo com a busca ativa.

## Mudanças

1. `src/components/tarefas/QuadroBoard.tsx`
   - Passar `dragDisabled={false}` para `ColunaLista` (remover a trava `dragDisabled={filtrando}`).

2. `src/components/tarefas/ColunaLista.tsx`
   - O item "Reorganizar cards" do menu da coluna continua bloqueado durante o filtro (mostra "Limpe os filtros para reorganizar"). Hoem ele usa a mesma flag do arraste; passar uma nova prop `filtrando` só para esse item, para que liberar o arraste não libere também a reorganização em massa.

Nada mais muda: permissões de arrastar por card, posição salva, filtros e o restante da tela ficam como estão.

## Validação

- Typecheck.
- Playwright: abrir um quadro, digitar na busca e arrastar um card para outra coluna; confirmar que move e salva.
