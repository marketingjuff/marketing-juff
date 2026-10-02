# Permissões e quadros num pop-up, na ficha de cada pessoa

## O que você vai ver
- A ficha de cada pessoa fica compacta: nome, papel, nova senha e bolinha nos cards (sigla, fundo e texto), como hoje.
- Na mesma linha da bolinha, logo depois do seletor de cor do texto, entra um botão **"Permissões"** com um pequeno resumo, por exemplo "Preset Social · 3 quadros".
- Ao clicar, abre um pop-up com o nome da pessoa no topo e, dentro dele:
  - a linha de presets;
  - todas as abas agrupadas (Social, Tarefas, Estratégia, Biblioteca, Configurações), com Sem acesso, Somente leitura, Ver ou Edição;
  - "Quadros em que entra".
- O pop-up tem os botões Cancelar e Aplicar. Aplicar só fecha o pop-up e guarda as escolhas na ficha. Nada é gravado até você clicar em **Salvar** na ficha, como hoje.
- Para quem é admin, o botão não aparece, porque o admin já tem tudo.
- A tela de criar uma pessoa nova não muda.

## Fora do escopo
Nenhuma regra de permissão, preset ou dado é alterado. Só a forma de mostrar muda.

## Detalhes técnicos
- Em `configuracoes.tsx`, dentro de `UserRow`, mover `PermissionPanel` e `QuadrosDoUsuario` para um `Dialog` (shadcn), com rolagem interna e largura `max-w-2xl`.
- O pop-up edita uma cópia de `perms`. Aplicar repassa para `setPerms`, e Cancelar descarta a cópia. Os quadros continuam com o salvamento próprio de `QuadrosDoUsuario`.
- O resumo do botão mostra o preset quando as permissões batem exatamente com um deles e, se não, "Personalizado". Mostra também o número de abas liberadas.
