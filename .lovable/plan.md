# Marketing Juff — sistema completo (SOCIAL / Stories)

Painel interno com login obrigatório, abas mestras no topo, sub abas por dentro, e a tela de Stories funcionando de ponta a ponta. Identidade visual igual ao PCP Juff.

## Backend (Lovable Cloud)

Ativar o Lovable Cloud com banco de dados, storage e autenticação.

- Tabela de perfis/permissões: usuário, nome, papel (admin, gestor, operador), lista de permissões no formato `modulo.aba` (com sufixo `:leitura` quando for só leitura) e marcação de troca de senha obrigatória.
- Tabela de stories: posição, status (pendente, aprovado, ajustar), comentário de ajuste e data do comentário.
- Tabela de frames: story, caminho da imagem no storage e ordem; apagar o story apaga os frames.
- Stories e frames só para usuário autenticado com a permissão da tela; sem acesso anônimo.
- Bucket de storage para as imagens, leitura para autenticados, upload direto do navegador após compressão.
- Banco começa vazio, sem dados de exemplo.

### Contas de fábrica
marketing@juff.com.br, juliana@juff.com.br, flavio@juff.com.br — papel admin, senha inicial `mona45lisa`, e-mail já confirmado, marcação de troca de senha ligada. Criação idempotente: se a conta existir, nada é duplicado ou sobrescrito.

## Login e usuários

- Tela de login com e-mail e senha. Sem cadastro aberto, sem login social.
- Link "esqueci minha senha": mensagem sempre igual, sem revelar se o e-mail existe. Após redefinir por e-mail, a pessoa entra direto.
- Troca de senha obrigatória no primeiro acesso: tela bloqueante logo após o login, nova senha duas vezes, mínimo 8 caracteres, não aceita a senha atual; ao salvar libera o sistema.
- Aba Configurações (admin e gestor) com a seção "Usuários e permissões" (só admin): criar conta (nome, e-mail, senha inicial, papel), painel de permissões por aba com opção edição ou só leitura, tabela de usuários com contagem de permissões, editar permissões em janela flutuante, trocar senha e excluir com confirmação.
- Criar conta, trocar senha de outro usuário e excluir rodam no servidor com credencial de serviço.
- Quem entra sem nenhuma permissão vê aviso de acesso não liberado e nenhuma aba.
- Catálogo inicial de permissões: `social.stories` e `config.usuarios`, num arquivo central de configuração.

## Navegação

- Barra superior: nome Marketing Juff; à direita nome do usuário, atalho para Configurações e sair.
- Abas mestras (só SOCIAL) e sub abas (só Stories, ativa por padrão), montadas de uma lista central que aponta a permissão de cada item; a aba só aparece para quem tem a permissão.
- Rota inicial redireciona para Stories dentro de SOCIAL.
- Em telas pequenas, gaveta lateral aberta por ícone de menu substitui as abas.

## Catálogo de produto Juff

Arquivo central de configuração com os 16 modelos, os 7 tamanhos e as 26 cores com hexadecimal exato, na ordem informada. Qualquer seletor de cor usa a cor real como fundo e ajusta o texto entre claro e escuro automaticamente.

## Tela Stories

**Upload**: arrastar e soltar ou clicar, várias imagens de uma vez, compressão no navegador (~900px, jpeg 0.7); cada imagem vira um frame de um story novo.

**Cards**: número de ordem, selo de status, frames lado a lado em miniatura 9:16, máximo 5 frames, botão "+" para adicionar frame no story, clique no frame abre a imagem grande com botão fechar, botão apagar com confirmação.

**Aprovação**: aprovar muda o status na hora; pedir ajuste abre campo de texto obrigatório no card e salva comentário com data, status vira ajustar.

**Arrastar e soltar** (mouse e toque, com toque longo no celular): card sobre card funde os stories respeitando o limite de 5 (aviso e bloqueio se passar) com notificação e botão desfazer; reordenar frames dentro do card; mover frame entre cards; soltar frame numa área vazia que aparece durante o arraste cria um story novo só com ele.

**Ações em massa**: contador aprovados/total, filtros em pílulas (todos, pendentes, aprovados, ajustar), aprovar todos os pendentes e limpar aprovados, ambos com confirmação. Após fusão, separação ou exclusão, renumeração automática e remoção de stories sem frames.

**Só leitura**: vê tudo, mas não envia, arrasta, aprova, pede ajuste nem apaga.

## Visual (igual ao PCP Juff)

Fonte Google Sans Flex carregada do Google Fonts (com alternativa por CDN), texto base 14.5px com suavização, títulos com letras levemente mais fechadas, cantos 0.75rem, sombras sutis. Todas as cores em oklch, tema claro, exatamente os valores informados (fundo, texto, superfícies, primária e sua variante suave, secundária, texto discreto, bordas, sucesso, alerta, destrutiva), sempre como variáveis de tema. Abas com a ativa em destaque na primária, foco discreto na primária, números tabulares, campos numéricos sem setinhas.

## Detalhes técnicos

- TanStack Start: rotas `src/routes/login`, `src/routes/trocar-senha`, `src/routes/_authenticated/social/stories`, `src/routes/_authenticated/configuracoes`; gate de autenticação no layout `_authenticated`.
- Ações administrativas em server functions com cliente de serviço; leituras e escritas normais pelo cliente do navegador com RLS.
- Papel e permissões em tabela separada, com função `security definer` para checagem nas policies (sem recursão, sem privilégio no perfil).
- Grants explícitos em toda tabela nova criada no schema público.
- TanStack Query com leitura no loader + `useSuspenseQuery`; mutações otimistas para status, ordem e fusão.
- Drag and drop com sensores de ponteiro e toque (long-press) para cards e frames.
- Metadados de head próprios por rota.
- Aviso final sobre o limite de envio de e-mail nativo, caso seja baixo.
