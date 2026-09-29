# Corrigir o retorno visual ao arrastar cards

## Resultado
- Ao soltar um card, ele permanece imediatamente na nova posição, sem voltar visualmente ao lugar anterior enquanto a alteração é salva.
- Se o arraste for cancelado ou a gravação falhar, o quadro restaura a posição anterior corretamente.

## Implementação
- Impedir que a sincronização dos dados recebidos sobrescreva a posição local apenas porque o arraste terminou.
- Guardar o estado anterior no início do arraste para permitir restauração em cancelamento ou erro.
- Manter a atualização do quadro em segundo plano e sincronizar novamente quando os dados atualizados chegarem.
- Conferir o arraste entre posições da mesma coluna e entre colunas.
