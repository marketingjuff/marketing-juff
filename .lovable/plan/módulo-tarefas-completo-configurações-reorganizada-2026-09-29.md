# Módulo Tarefas completo + Configurações reorganizada

Executar o arquivo `tarefas-modulo-completo.md` inteiro, numa única passada, sem mexer em nada do módulo Social/Stories.

## O que você vai ver
- Nova aba mestre **TAREFAS** no menu superior, com: Quadros, Meu trabalho e Calendário.
- **Quadros** estilo Kanban: criar quadro com fundo, colunas, cards que sobem e descem livremente, etiquetas, responsável, prazo, marca de "adiado" com data de retomada, arquivar (exclusão real só para admin, com nome digitado).
- Quadro sem participantes fica aberto a todos com permissão de Tarefas; com participantes, só eles e os admins entram.
- **Meu trabalho**: lista dos cards onde você é responsável. **Calendário**: visão mensal por prazo.
- **Configurações** abre também para gestor: permissões agrupadas por aba, cada uma com Sem acesso / Somente leitura / Edição, e linha de presets prontos. Gestor só vê, cria e altera operadores.

## Passos
1. Banco: aplicar a migração do arquivo exatamente como está (tabelas de quadros, membros, colunas, etiquetas, cards e regras de acesso).
2. Substituir `src/config/navigation.ts` pelo novo catálogo (grupos, presets, nível configurável).
3. `src/lib/admin.functions.ts`: regras de gestor checadas no servidor ("Gestor só altera operadores").
4. `configuracoes.tsx`: permissões agrupadas em três estados, presets, travas para gestor; CTAs e links mantidos.
5. Criar `src/lib/tarefas.ts` e os componentes em `src/components/tarefas/` (FundoPicker, NovoQuadroDialog, ColunaLista, CardMini, CardDialog, QuadroBoard, ListaCards, MesCalendario).
6. Criar as rotas `tarefas/quadros`, `tarefas/quadros/$quadroId`, `tarefas/meu-trabalho`, `tarefas/calendario`.
7. Aplicar as regras de permissão no front e conferir os critérios de aceite da seção 11.

## Não será tocado
Arquivos de Stories, bibliotecas `story-*`, `objectives.ts`, migrações antigas, tabelas existentes, funções `has_role/has_permission/can_edit` e os três papéis.
