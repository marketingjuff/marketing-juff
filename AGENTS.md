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
- Push do navegador: o banco dispara (pg_net) a rota pública `/api/public/push-enviar`, que só envia notificação recém-nascida e ainda sem `push_enviado_em` — dispensa segredo compartilhado e garante um push por notificação; envio usa WebCrypto porque o servidor não roda Node.
- Catálogo de estampas: receitas por grupo × cor de camiseta gravadas via RPCs `biblioteca_estampa_salvar_receita`/`biblioteca_combo_registrar`; arquivos na pasta `estampas/` do depósito `marca` (uma chamada por célula, sem duplicar combos).
- Combos de cores de estampas são administrados dentro do catálogo de Estampas, porque fazem parte desse fluxo e não das configurações gerais.
- Campos de senha usam o componente compartilhado `PasswordInput`, para manter a alternância mostrar/ocultar consistente em todo o sistema.
- Seeding (Social): remessas mês×motivo com peças; marcação em lote e painel via RPCs `social_seeding_marcar_coluna`/`social_seeding_painel`, custo vigente por `social_seeding_custo_do_mes` — uma chamada por ação, sem laços na tela.
- Board and card label creation share NovaEtiquetaForm and the existing label write permission; this keeps validation and board scoping consistent without broadening access.
- Board background suggestions combine accessible boards with browser-local recent combinations recorded only after successful saves, preserving solid/gradient mode without changing board colors or permissions.
