# Cores completas para etiquetas e seletores

## O que será feito
- Adicionar uma cor de texto independente para cada etiqueta, mantendo a cor atual como fundo.
- Atualizar criação, edição e exibição das etiquetas em cards, listas e janelas.
- Criar um seletor de cor reutilizável com amostra, campo hexadecimal e painel visual para escolher matiz, claro e escuro arrastando.
- Substituir os seletores atuais de cores das etiquetas, fundos de quadros e textos/sombras das artes pelo novo controle.
- Preservar a regra de hexadecimal minúsculo com seis dígitos e mostrar erro no próprio campo.

## Dados
- Acrescentar `cor_texto` às etiquetas existentes, preenchendo automaticamente uma cor legível inicial.
- Manter as permissões atuais: apenas quem já podia editar etiquetas poderá alterar suas cores.

## Validação
- Conferir criação e edição de etiqueta com fundo e texto personalizados.
- Conferir o seletor visual por clique e arraste, inclusive tons claros e escuros.
- Confirmar a aparência das etiquetas nos quadros e a compilação do sistema.
