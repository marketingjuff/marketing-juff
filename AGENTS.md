<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Tarefas: acesso a quadro via funções `pode_ver_quadro/pode_editar_quadro(_quadro_id)` que usam auth.uid() internamente — nunca aceitar id de usuário vindo de fora (mesma regra das funções de papel).
- Seleção de cores: usar o componente compartilhado `ColorPicker`, garantindo painel visual e hexadecimal minúsculo em todos os controles.
