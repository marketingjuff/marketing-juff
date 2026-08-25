# Marketing Juff — Módulo Social / Stories

Painel de aprovação de stories, sem login, funcionando em celular e computador, com dados salvos na nuvem.

## Navegação

- Barra superior com o nome **Marketing Juff**.
- Linha de abas mestras (horizontal). Apenas **SOCIAL** funcional; as demais ficam previstas e desabilitadas.
- Linha de sub abas dentro de SOCIAL. Apenas **Stories** funcional e ativa por padrão.
- Menu montado a partir de uma lista de configuração, para adicionar abas e sub abas depois sem refazer nada.
- Rota inicial `/` redireciona para `/social/stories`.

## Tela Stories

**Upload**
- Área de arrastar e soltar, ou clique para escolher, aceitando várias imagens.
- Compressão no navegador antes de enviar: ~900px de largura, JPEG qualidade 0.7.
- Cada imagem enviada cria um story novo com um frame.

**Cards**
- Card compacto por story: número de ordem, selo de status (pendente, aprovado, ajustar) e frames em miniatura 9:16 lado a lado.
- Máximo de 5 frames por story; botão "+" dentro do card adiciona frame naquele story.
- Clique no frame abre lightbox em tela cheia.
- Botão apagar com confirmação, removendo story e imagens.

**Aprovação**
- Botão aprovar: muda status na hora.
- Botão pedir ajuste: abre campo de texto obrigatório no card; ao confirmar, status vira "ajustar" e o comentário fica visível com a data.

**Arrastar e soltar (mouse e toque, com toque longo no celular)**
- Card sobre card: funde os stories juntando os frames, respeitando o limite de 5 (aviso e bloqueio se passar).
- Notificação de fusão com botão desfazer.
- Reordenar frames dentro do card.
- Mover frame de um card para outro.
- Soltar frame numa área vazia que aparece durante o arraste: cria um story novo só com ele.

**Ações em massa e filtros**
- Contador fixo no topo: aprovados / total.
- Filtros em pílulas: todos, pendentes, aprovados, ajustar.
- Aprovar todos os pendentes (com confirmação).
- Limpar aprovados: apaga stories aprovados e suas imagens (com confirmação).
- Após qualquer fusão, separação ou exclusão: renumeração automática e remoção de stories sem frames.

## Visual

Fundo neutro, cantos arredondados, sombra leve. Três cores de status próprias (pendente, aprovado, ajustar) aplicadas em selos e bordas. Vários cards por linha em telas grandes, um por linha no celular. Todas as cores como tokens do design system.

## Detalhes técnicos

- Ativar **Lovable Cloud** (banco + storage) — ainda não está habilitado neste projeto.
- Tabelas: `stories` (posição, status, comentário de ajuste, data do comentário) e `story_frames` (story_id, caminho da imagem, ordem). Acesso público de leitura e escrita (anon), pois a tela não exige login; grants explícitos incluídos na migração.
- Bucket público de storage para as imagens; upload direto do navegador após compressão via canvas.
- Rotas: `src/routes/social/stories.tsx` com layout de abas em `src/routes/social/route.tsx`.
- Estado com TanStack Query (leitura via loader + `useSuspenseQuery`), mutações otimistas para status, ordem e fusões.
- Drag and drop com sensores de ponteiro e toque (long-press) suportando cards e frames.
- Metadados de head próprios na rota Stories (título, descrição, og/twitter).
