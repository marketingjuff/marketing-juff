-- =====================================================================
-- BLOCO 1, etiqueta global ADIADO
-- =====================================================================

insert into public.tarefa_etiquetas (nome, cor, cor_texto, quadro_id, posicao)
select 'ADIADO', '#5f5e5a', '#ffffff', null,
       coalesce((select max(posicao) + 1 from public.tarefa_etiquetas where quadro_id is null), 0)
where not exists (
  select 1 from public.tarefa_etiquetas
  where quadro_id is null and upper(trim(nome)) = 'ADIADO'
);

-- =====================================================================
-- BLOCO 2, desligar o aviso de card atribuído durante a carga
-- =====================================================================

alter table public.tarefa_cards disable trigger notificar_atribuicao;

-- =====================================================================
-- BLOCO 3, descrição nos 15 cards que já existem
-- Só grava onde a descrição está vazia hoje
-- =====================================================================

-- Juff Custom, Adicionar bloco na Custom
update public.tarefa_cards t
set descricao = $juff$<h3>🟣 BLOCO EXTRA — Juff Store</h3><h4>Título:</h4><p>E quando são poucas peças?</p><h4>Texto:</h4><p>Nem sempre você precisa de um pedido completo.</p><p>Se a ideia é ter uma peça para você, para o dia a dia ou para momentos mais pontuais, a <strong>Juff Store</strong> resolve.</p><p>Lá você encontra camisetas prontas, com o mesmo tecido leve e confortável da Juff, e opções de personalização mais simples.</p><p>👉 Para usar.</p><p>👉 Para repetir.</p><p>👉 Para levar com você.</p><hr><h4>CTA:</h4><p>Conhecer a Juff Store</p><p>(link para <a href="http://loja.juff.com.br" target="_blank" rel="noopener">http://loja.juff.com.br</a> )</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Custom'
  and t.titulo = 'Adicionar bloco na Custom'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Custom, Nova estrutura do site juff.com.br
update public.tarefa_cards t
set descricao = $juff$<h3>a) Páginas e títulos com foco em “poliamida personalizada”</h3><ul><li><p>Criar páginas específicas com <strong>títulos que remetam direto à busca</strong>:</p></li><li><p>Ex.:</p></li><li><p>“Camisetas de Poliamida Personalizadas – Juff Sportswear”</p></li><li><p>“Poliamida 100% para Camisetas Esportivas Personalizadas”</p></li><li><p>Colocar essas frase‑chave em:</p></li><li><p><strong>title tag</strong> da página,</p></li><li><p><strong>H1</strong> (título principal da página),</p></li><li><p>e no <strong>primeiro parágrafo</strong> descritivo.</p></li></ul><p>Isso ajuda o Google a entender que a Juff é <strong>alternativa direta</strong> para quem busca “camiseta de poliamida personalizada”.</p><h3>b) Conteúdo textual reforçando a especialidade</h3><ul><li><p>Nas páginas de camiseta em poliamida, vale <strong>explicitar melhor</strong>:</p></li><li><p>“Camisetas de poliamida personalizadas para empresas, academias, corrida e eventos”</p></li><li><p>“Poliamida 100% com proteção UV 25+ para camisetas personalizadas”</p></li><li><p>“Camisetas em poliamida com sublimação total para uniformes esportivos”</p></li><li><p>Isso ajuda a <strong>capturar variações de busca</strong> como</p></li></ul><p><code>"camiseta poliamida sublimação"</code>, <code>"uniforme poliamida personalizada"</code> etc.</p><h3>c) URLs e estrutura de site</h3><ul><li><p>Garantir que a <strong>URL principal</strong> da camiseta poliamida tenha algo como:</p></li><li><p><code>custom.juff.com.br/camisetas-poliamida-personalizadas</code></p></li><li><p>ou <code>juff.com.br/camisetas-poliamida</code></p></li><li><p>Evitar URLs muito genéricas como <code>juff.com.br/produto/12345</code>; isso <strong>enfraquece o SEO</strong>para buscas específicas.</p></li></ul><h3>d) Meta‑descrição otimizada</h3><ul><li><p>Colocar <strong>meta‑descrições</strong> que soem como resposta direta às dúvidas do comprador:</p></li><li><p>Ex.:</p></li><li><p>“Camisetas de poliamida 100% com sublimação completa para academias, corridas e eventos corporativos. Orçamento via WhatsApp e telefone.”</p></li><li><p>Isso ajuda a <strong>aumentar o CTR</strong> (taxa de cliques) quando a Juff aparecer.</p></li></ul><h3>e) Telefone e atendimento explícitos</h3><ul><li><p>Você já tem o telefone na home, mas vale <strong>repetir</strong> em:</p></li><li><p>rodapé de todas as páginas,</p></li><li><p>dentro de seções de “Camisetas de Poliamida”,</p></li><li><p>e em banners tipo “Solicite um orçamento por WhatsApp / telefone”.</p></li><li><p>Isso reforça para o Google que a empresa oferece <strong>atendimento humano</strong> (e não só pedido online), o que às vezes é priorizado em buscas locais.</p></li></ul><h3>f) Conteúdo de blog / FAQ</h3><ul><li><p>Criar posts simples:</p></li><li><p>“Poliamida vs poliéster: qual é melhor para camisetas esportivas?”</p></li><li><p>“Como escolher a melhor camiseta de poliamida personalizada para eventos?”</p></li><li><p>Isso aumenta autoridade do domínio em <strong>temas de poliamida e camisetas personalizadas</strong>.</p></li></ul><h3>g) Referências de outras páginas para a Juff</h3><ul><li><p>Tentar que <strong>sites de corrida, academias, grupos de triathlon, assessorias</strong> mencionem:</p></li><li><p>“Camisetas de poliamida personalizadas Juff”</p></li><li><p>com <strong>link</strong> para <code>custom.juff.com.br</code> ou <code>juff.com.br</code>.</p></li><li><p>Links de autoridade ajudam muito em <strong>buscas regionais</strong> como “camisetas poliamida SP”, “camisetas poliamida personalizada Brasil”.</p></li></ul>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Custom'
  and t.titulo = 'Nova estrutura do site juff.com.br'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Custom, Anúncios Google Ads Juff Custom
update public.tarefa_cards t
set descricao = $juff$<p>Adicionado R$ 2000,00 no cartao dia 25/11/25</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Custom'
  and t.titulo = 'Anúncios Google Ads Juff Custom'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Custom, Ideias para o site novo
update public.tarefa_cards t
set descricao = $juff$<p>UMA Pparte no site com ideias de combinacao de cores de camisetas e estampas. Nao usando camisetas prontas nossas de clientes, mas dando ideias mesmo, com camiseta rosa e estampa azul e camiseta azul com estampa rosa para equipe e participantes por exemplo. o mesmo pode brincar com areia e marrom, marrom e amarelo fluor etc.</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Custom'
  and t.titulo = 'Ideias para o site novo'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Store, Descrição do produto da Juff Store de forma visual
update public.tarefa_cards t
set descricao = $juff$<p><a href="https://www.nescafe-dolcegusto.com.br/maquinas-cafe/mini-me-preta-110v" target="_blank" rel="noopener">https://www.nescafe-dolcegusto.com.br/maquinas-cafe/mini-me-preta-110v</a></p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Store'
  and t.titulo = 'Descrição do produto da Juff Store de forma visual'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Store, Atualizar fichas técnicas uma a uma nos tamanhos
update public.tarefa_cards t
set descricao = $juff$<p>PLANILHA DE ATUALIZAÇÃO DE ESTAMPAS PARA COMPANHAMENTO</p><p><a href="https://docs.google.com/spreadsheets/d/1QvwLGJdX8Z04WfToFyhTVPq-j7ncu7wzq3FRunUlCFU/edit?copiedFromTrash=&amp;gid=1910580915#gid=1910580915" target="_blank" rel="noopener">https://docs.google.com/spreadsheets/d/1QvwLGJdX8Z04WfToFyhTVPq-j7ncu7wzq3FRunUlCFU/edit?copiedFromTrash=&amp;gid=1910580915#gid=1910580915</a></p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Store'
  and t.titulo = 'Atualizar fichas técnicas uma a uma nos tamanhos'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Store, Atualização de produtos no ecom com informação de tecido
update public.tarefa_cards t
set descricao = $juff$<p><a href="https://www.tf.com.br/camiseta-feminina-manga-curta-thermodry-gota-branco/p" target="_blank" rel="noopener">https://www.tf.com.br/camiseta-feminina-manga-curta-thermodry-gota-branco/p</a></p><p>[anexo de imagem ficou no Trello]</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Store'
  and t.titulo = 'Atualização de produtos no ecom com informação de tecido'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Store, Subir vídeos na Juff Store
update public.tarefa_cards t
set descricao = $juff$<p>Subir vídeos assim como subimos para Street Running</p><p><a href="https://loja.juff.com.br/juff-store-camiseta-thermoair-street-running?variant_id=33435" target="_blank" rel="noopener">https://loja.juff.com.br/juff-store-camiseta-thermoair-street-running?variant_id=33435</a></p><p>Dá pra subir:</p><p>Baby look lisa fem - <a href="https://www.instagram.com/p/DTnN9KbDkch/" target="_blank" rel="noopener">https://www.instagram.com/p/DTnN9KbDkch/</a></p><p>Regata cross - colocar vídeo cru, sem legendas - <a href="https://www.instagram.com/p/DOoxnyZD2C9/" target="_blank" rel="noopener">https://www.instagram.com/p/DOoxnyZD2C9/</a></p><p>Regata lisa masc - <a href="https://www.instagram.com/p/DSx3x6GD041/" target="_blank" rel="noopener">https://www.instagram.com/p/DSx3x6GD041/</a></p><p>Regata futevolei fem - <a href="https://www.instagram.com/p/DSdI09lj7o1/" target="_blank" rel="noopener">https://www.instagram.com/p/DSdI09lj7o1/</a></p><p>Regata futevolei masc - <a href="https://www.instagram.com/p/DSF9HTMDzgi/" target="_blank" rel="noopener">https://www.instagram.com/p/DSF9HTMDzgi/</a></p><p>Regata Sunrise fem - <a href="https://www.instagram.com/p/DR2cstJD48s/" target="_blank" rel="noopener">https://www.instagram.com/p/DR2cstJD48s/</a></p><p>Baby look Tennis 1873 - <a href="https://www.instagram.com/p/DRKMRp_DQsQ/" target="_blank" rel="noopener">https://www.instagram.com/p/DRKMRp_DQsQ/</a></p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Store'
  and t.titulo = 'Subir vídeos na Juff Store'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Store, Personalização com a R2U
update public.tarefa_cards t
set descricao = $juff$<p>Precisamos fazer a jornada do cliente como funciona para mostrar para eles.</p><p>Precisamos tb (eles pediram) um ayout mais ou menos do que a gente imageina na tela do cliente.</p><p>E-mail do Thiago é: <a href="mailto:thiago@r2u.io" target="_blank" rel="noopener">thiago@r2u.io</a></p><p><a href="https://r2u.io/contato/" target="_blank" rel="noopener">https://r2u.io/contato/</a></p><p><a href="mailto:giovanni@r2u.io" target="_blank" rel="noopener">giovanni@r2u.io</a></p><p>ideias para ter</p><p>[anexo de imagem ficou no Trello]</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Store'
  and t.titulo = 'Personalização com a R2U'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Juff Store, MAMD site Juff Store
update public.tarefa_cards t
set descricao = $juff$<p><a href="https://www.insiderstore.com.br/products/tech-t-shirt?variant=43571682246805" target="_blank" rel="noopener">https://www.insiderstore.com.br/products/tech-t-shirt?variant=43571682246805</a></p><p>VER COM RAFA PARA USAR A PARTE DE FOTOS DE APRESENTACAO DO PRODUTO QUE A INSIDER USA.</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Juff Store'
  and t.titulo = 'MAMD site Juff Store'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Estampas, Ver estampas femininas para diminuir
update public.tarefa_cards t
set descricao = $juff$<p>TESTAMOS 20% e ficou pequeno demais</p><p>testamos 10% e teve um bom resultado. vamos ter que testar estampa por estampa para aprovar essa diminuição.</p><p>as novas estampas a partir da abstract já terao essa diminuição gradual.</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Estampas'
  and t.titulo = 'Ver estampas femininas para diminuir'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Estampas, Vasculhar estampas que menos vendem
update public.tarefa_cards t
set descricao = $juff$<p>Fazer uma varredura das estampas que menos venderam desde a criação do site. Precisa ter o seguinte filtro:</p><p>1 - Listar as estampas do menor para o maior volume de vendas com suas quantidades (apenas ESTAMPA; não considerar modelo nem tamanho). Exemplo: enjoy the ride — 10 peças / bt neon — 85 peças.</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Estampas'
  and t.titulo = 'Vasculhar estampas que menos vendem'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Marketing Interno, Atualização Olist estoque para os novos produtos
update public.tarefa_cards t
set descricao = $juff$<p><a href="https://docs.google.com/spreadsheets/d/14FAfNnPWdfyR5jgT-XLwALUe0814MZ3g5aQ-hjKiSbw/edit?gid=0#gid=0" target="_blank" rel="noopener">https://docs.google.com/spreadsheets/d/14FAfNnPWdfyR5jgT-XLwALUe0814MZ3g5aQ-hjKiSbw/edit?gid=0#gid=0</a></p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Marketing Interno'
  and t.titulo = 'Atualização Olist estoque para os novos produtos'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Marketing Interno, Teste controlado do RD Conversas
update public.tarefa_cards t
set descricao = $juff$<p>Depois das restrições que tivemos no envio de mensagens pelo WhatsApp, vamos fazer um <strong>teste simples e controlado</strong> antes de voltar a usar o canal para campanhas.</p><p>A ideia é mudar a abordagem: em vez de enviar promoção direta, iniciar uma <strong>conversa curta com pergunta</strong>, para gerar resposta e medir engajamento.</p><p><strong>Mensagem proposta</strong></p><p>Oi, tudo bem?</p><p>Aqui é da Juff 🙂</p><p>Sabia que a Juff está com um brinde especial para pedidos de camisetas personalizadas em março? Gostaria de falar sobre pedidos de camisetas?</p><p><strong>Botões</strong></p><p>#sim</p><p>#depois</p><p>#bloquear</p><p><strong>Objetivos do teste</strong></p><ul><li><p>aumentar engajamento</p></li><li><p>limpar a base (quem não quiser pode sair facilmente)</p></li><li><p>evitar novas restrições do WhatsApp</p></li><li><p>validar um modelo de conversa antes de escalar</p></li></ul><p><strong>Como será feito</strong></p><ul><li><p>primeiro envio para cerca de <strong>100 contatos</strong></p></li><li><p>avaliar quantas pessoas respondem</p></li><li><p>meta mínima: <strong>5% de resposta</strong></p></li></ul><p>Se o resultado for positivo, repetimos o teste nas semanas seguintes com outros grupos.</p><p>A ideia é retomar o uso do WhatsApp <strong>com segurança e mais controle</strong>, sem afetar o atendimento.</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Marketing Interno'
  and t.titulo = 'Teste controlado do RD Conversas'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- Marketing Interno, Limpeza anual de base
update public.tarefa_cards t
set descricao = $juff$<p>Limpeza anual da base do RD Station. Janela de janeiro a março, um mês pra cada etapa.</p><p><strong>Por que isso existe.</strong> Em agosto de 2026 a base tinha 6.326 desengajados de 12.127 leads cobrados. Ou seja, 52% do que a Juff paga não interage. Inválido não é cobrado, desengajado é.</p><p><strong>Regra que não muda.</strong> Clique resgata, abertura sozinha não resgata. O Mail Privacy Protection da Apple abre e-mail sozinho, então abertura é métrica furada.</p><p><strong>Cuidado principal.</strong> O Behavior Score do RD só olha e-mail. Ele não enxerga compra nem conversa no RD Conversas. Se cortar por Behavior Score puro, você apaga cliente bom.</p><p><strong>Janeiro é preparação. Fevereiro é disparo. Março é corte.</strong></p><p>Os desengajados não são todos iguais. Metade provavelmente entrou por feira, QR code ou lista importada e nunca recebeu nada. Esses não precisam de reengajamento, precisam de boas-vindas. Por isso a divisão em Grupo A e Grupo B.</p><p>No fim, descadastrar em vez de excluir. O lead vira inválido, para de contar na cobrança e o histórico fica salvo.</p>$juff$
from public.tarefa_quadros q
where q.id = t.quadro_id
  and q.nome = 'Marketing Interno'
  and t.titulo = 'Limpeza anual de base'
  and t.arquivado = false
  and coalesce(t.descricao, '') = '';

-- =====================================================================
-- BLOCO 4, os 18 cards novos
-- Nuno como criador e responsável, entrando no fim da coluna
-- =====================================================================

-- Marketing Interno, Planejamento, Emails 2026
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'Emails 2026', $juff$<p>JANEIRO <a href="https://docs.google.com/document/d/1WCuE6xbB6LcH51P5Jp3mSfyflkwI18TGUGSyzmPNaik/edit?tab=t.0" target="_blank" rel="noopener">https://docs.google.com/document/d/1WCuE6xbB6LcH51P5Jp3mSfyflkwI18TGUGSyzmPNaik/edit?tab=t.0</a></p><p>FEVEREIRO <a href="https://docs.google.com/document/d/1ps8Sea8pmkDk_4DjN9Bhh39Yp1z9VHqFmEBn95pPx54/edit?usp=sharing" target="_blank" rel="noopener">https://docs.google.com/document/d/1ps8Sea8pmkDk_4DjN9Bhh39Yp1z9VHqFmEBn95pPx54/edit?usp=sharing</a></p><p>MARÇO <a href="https://docs.google.com/document/d/1xckDcLsl_ksXnjU3SPpfsPgsNUKpDH_HyaWUJGqo2CE/edit?tab=t.0" target="_blank" rel="noopener">https://docs.google.com/document/d/1xckDcLsl_ksXnjU3SPpfsPgsNUKpDH_HyaWUJGqo2CE/edit?tab=t.0</a></p><p>ABRIL <a href="https://docs.google.com/document/d/18dd94xzQIxfV-SJGrTBJq8CKEiZKhgX-dNZ3zMTZXdk/edit?tab=t.0" target="_blank" rel="noopener">https://docs.google.com/document/d/18dd94xzQIxfV-SJGrTBJq8CKEiZKhgX-dNZ3zMTZXdk/edit?tab=t.0</a></p><p>MAIO <a href="https://docs.google.com/document/d/1HrVwNKv8UbQvofwcjqLPKjdKh5KVosFxWy3AtdruHB0/edit?usp=sharing" target="_blank" rel="noopener">https://docs.google.com/document/d/1HrVwNKv8UbQvofwcjqLPKjdKh5KVosFxWy3AtdruHB0/edit?usp=sharing</a></p><p>JUNHO - <a href="https://docs.google.com/document/d/1dpM9VGspMkWIdtBeRui9eer6qWExuNJQcdmG8wLg5kM/edit?tab=t.0" target="_blank" rel="noopener">https://docs.google.com/document/d/1dpM9VGspMkWIdtBeRui9eer6qWExuNJQcdmG8wLg5kM/edit?tab=t.0</a></p><p>JULHO - <a href="https://docs.google.com/document/d/1DNudIYtcy6NEliGl2m16hXZXsbOZYUGa1YpU4n3417w/edit?tab=t.0" target="_blank" rel="noopener">https://docs.google.com/document/d/1DNudIYtcy6NEliGl2m16hXZXsbOZYUGa1YpU4n3417w/edit?tab=t.0</a></p><p>AGOSTO - <a href="https://docs.google.com/document/d/1MtNf5zejmTxfhmoJ-CGI3imm1SgEpJsAh1VfYWGnpQ0/edit?tab=t.0" target="_blank" rel="noopener">https://docs.google.com/document/d/1MtNf5zejmTxfhmoJ-CGI3imm1SgEpJsAh1VfYWGnpQ0/edit?tab=t.0</a>PRONTO E REVISADO POR NUNO</p><p>SETEMBRO - <a href="https://docs.google.com/document/d/139J8RAS9yVXnbPvRS3EiVXDuVEU730zsLoe6szyqJYo/edit?tab=t.0#heading=h.lx4ruhfwhqx" target="_blank" rel="noopener">https://docs.google.com/document/d/139J8RAS9yVXnbPvRS3EiVXDuVEU730zsLoe6szyqJYo/edit?tab=t.0#heading=h.lx4ruhfwhqx</a>PRONTO E REVISADO POR NUNO</p><p>OUTUBRO - <a href="https://docs.google.com/document/d/1qYqW0hTfTSywrTeT5_d481Bk3LvO91acMmfuEGZph5c/edit?tab=t.0#heading=h.wk7593q0pfyd" target="_blank" rel="noopener">https://docs.google.com/document/d/1qYqW0hTfTSywrTeT5_d481Bk3LvO91acMmfuEGZph5c/edit?tab=t.0#heading=h.wk7593q0pfyd</a>EM REVISAO AINDA</p><p>NOVEMBRO - <a href="https://docs.google.com/document/d/1HH0wyLGGHnFdS3Qn66Bs0yE3XAlDh1Lmus7sWFTwCJI/edit?tab=t.0#heading=h.3sln1as2q79q" target="_blank" rel="noopener">https://docs.google.com/document/d/1HH0wyLGGHnFdS3Qn66Bs0yE3XAlDh1Lmus7sWFTwCJI/edit?tab=t.0#heading=h.3sln1as2q79q</a>EM REVISAO AINDA</p><p>EM JULHO VAMOS Dar um upgrade nos emails. Seguindo a referencia abaixo.</p><p>1 - Usar o PSD para essa referência</p><p>2 - Excluir o bloco Instagram e criar quatro minibanners de rodapé para substituição</p><p>3 - Criar mais quatro minibanners de rodapé para o atacarejo: comprando 10 peças ou mais direto no site (peças básicas, lisas e tradicionais), o cliente ganha 40% de desconto (condição fixa do site, não promoção).</p><p>4 - Queremos um e-mail mais clean e discreto. Temos mais fotos agora e, com a ajuda da IA, podemos obter imagens melhores. Pedir ao Nuno alguma imagem ou ideia de fotografia, se necessário.</p><p>[anexo de imagem ficou no Trello]</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'Emails 2026'
  );

-- Marketing Interno, A fazer, manual atualizacao fontes e elementos+capa da tabela de cores pra van + novo folder
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'manual atualizacao fontes e elementos+capa da tabela de cores pra van + novo folder', $juff$<h3>Objetivo</h3><p>Temos dois itens para serem trabalhados neste cartão:</p><h4>1. Atualização do Manual da Marca</h4><p>Precisamos fazer uma revisão do manual de marca existente, mantendo sua estrutura, mas atualizando alguns pontos para refletir a comunicação atual da Juff.</p><p><strong>Principais ajustes:</strong></p><ul><li><p>Atualizar as fontes utilizadas no manual, conforme a identidade visual vigente.</p></li><li><p>Revisar os exemplos de aplicação da marca, substituindo-os por exemplos mais alinhados ao padrão visual dos e-mails marketing que estamos produzindo a partir de <strong>julho de 2026</strong>.</p></li><li><p>Caso identifique alguma oportunidade de melhoria na apresentação, fique à vontade para sugerir.</p></li></ul><h4>2. Atualização da capa da Tabela de Cores</h4><p>Precisamos modernizar o layout da capa da tabela de cores.</p><p>Neste momento, <strong>o foco é apenas na parte visual</strong>. Os textos podem permanecer exatamente como estão; depois fazemos eventuais ajustes de conteúdo, se necessário.</p><h4>3. Atualização dos folders</h4><p>Precisamos modernizar o layout dos folders. Neste momento, <strong>o foco é apenas na parte visual</strong>. Os textos podem permanecer exatamente como estão; depois fazemos eventuais ajustes de conteúdo, se necessário. Mesmos tamanhos. é mais para ficarmos tudo com uma mesma unidade visual Van.</p><h3>Arquivos</h3><p>Você encontra todos os materiais do manual de marca na pasta manual de marca.</p><p>Ja o arquivo de impressao da tabela de cores esta nesse link</p><p><a href="https://drive.google.com/drive/folders/1qjwK6Oz2KjVIVDJ2ZMb47wLWxNKGGqkp?usp=drive_link" target="_blank" rel="noopener">https://drive.google.com/drive/folders/1qjwK6Oz2KjVIVDJ2ZMb47wLWxNKGGqkp?usp=drive_link</a></p><p>7 - MATERIAL IMPRESSO/JUFF/2025/CAPA AMOSTRA DE TECIDO</p><p>Eles servirão como base para a atualização dos dois materiais.</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'A fazer' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'manual atualizacao fontes e elementos+capa da tabela de cores pra van + novo folder'
  );

-- Juff Store, A fazer, Demanda Setembro - Instruções de personalização
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'Demanda Setembro - Instruções de personalização', $juff$<p>[anexo de imagem ficou no Trello]</p><h2>BRIEFING DE ARTE — Instruções de Personalização | Juff Store</h2><blockquote><p>Substitui integralmente a peça atual de 12 cards.</p></blockquote><hr><h3>1. O que é e onde vai</h3><p>Peça informativa que ocupa a aba "Instruções de Personalização" nas páginas de produto do site. É o único lugar onde o cliente encontra as regras de personalização, então tudo que não estiver nesta arte não foi informado.</p><p>O cliente não vê nenhuma simulação da personalização antes de comprar. Esta arte é a única referência visual que ele tem do resultado. Isso pesa nas decisões de layout mais adiante.</p><hr><h3>2. Formato e especificações técnicas</h3><h4>2.1 Estrutura</h4><p><strong>Arquivo único, vertical, coluna única.</strong></p><p>A peça atual usa duas colunas de cards. Isso não sobrevive no celular. Layout de coluna única é a única forma de a mesma imagem funcionar nas duas telas sem versão separada.</p><h4>2.2 Dimensões</h4><ul><li><p>Largura fixa de <strong>1080 px</strong>.</p></li><li><p>Altura <strong>totalmente livre</strong>. A peça cresce o quanto o conteúdo precisar, sem teto.</p></li><li><p>Só uma checagem. Acima de 8000 px de altura, alguns navegadores móveis perdem qualidade na renderização. Se a arte passar disso, abrir no celular e conferir se o texto continua nítido antes de entregar.</p></li></ul><h4>2.3 Legibilidade</h4><p>Num celular a imagem de 1080 px aparece com cerca de 380 px de largura, mais ou menos um terço do tamanho original. Vale ter isso em mente na hora de dimensionar o texto, sem virar camisa de força. O cliente pode dar zoom, então o que importa é a hierarquia, não um tamanho fixo.</p><p>Uma boa referência de partida, com liberdade para ajustar conforme a composição pedir.</p><p>Elemento Referência Títulos de bloco os maiores da peça, bem destacados Texto corrido em torno de 36 px a 44 px Observações e legendas pode ser menor, sem problema</p><p>O que realmente não pode ficar pequeno é o essencial, ou seja, os limites de caracteres, o bloco de atenção e os nomes das cores na cartela. Esses o cliente precisa ler de primeira. O resto ele lê com calma, e se precisar dar zoom, tudo bem.</p><p>Linhas curtas ajudam mais que fonte grande. Textos com cerca de 40 caracteres por linha e entrelinha folgada ficam confortáveis mesmo em corpo menor.</p><h4>2.4 Arquivo</h4><ul><li><p>PNG, até 1 MB.</p></li><li><p>Se as fotos empurrarem o arquivo acima de 1,5 MB, talvez valha separar em dois arquivos. Não tem problema se os arquivos ficarem com alturas diferentes.</p></li><li><p>Perfil de cor sRGB.</p></li></ul><p>###</p><hr><h3>3. Direção de conteúdo</h3><p>Enxuto, com muita foto de pessoa real e exemplo visual. A regra de ouro é que o cliente entenda olhando, e leia só para confirmar. Cada bloco tem uma ideia e uma imagem que a prova.</p><p>Ordem dos blocos abaixo. A designer tem liberdade sobre composição e proporção, não sobre a ordem nem sobre o conteúdo.</p><hr><h3>4. Blocos, na ordem</h3><h4>Bloco 1 — Abertura</h4><p><strong>Copy</strong></p><p>```</p><p>PERSONALIZE SUA CAMISETA</p><p>Seu nome, seu @, sua profissão. Você escreve e sai impresso na peça.</p><p>```</p><p><strong>Imagem.</strong> Uma foto ampla de pessoa usando camiseta personalizada, de costas, com o texto legível.</p><hr><h4>Bloco 2 — Onde a personalização pode ir</h4><p><strong>Copy</strong></p><p>```</p><p>ONDE VAI O SEU TEXTO</p><p>Frente ou costas, até 2 linhas de 20 caracteres cada.</p><p>Mangas, 1 linha de 10 caracteres em cada manga.</p><p>Camiseta com estampa nas costas leva o texto na barra, também</p><p>com 20 caracteres por linha.</p><p>```</p><p><strong>Imagem.</strong> Quatro fotos, uma para cada posição. Frente, costas, barra e manga. Esse é o bloco mais importante da peça e merece o maior espaço.</p><hr><h4>Bloco 3 — Direção das mangas</h4><p><strong>Copy</strong></p><p>```</p><p>MANGA DIREITA E MANGA ESQUERDA</p><p>A referência é a peça vestida, não a foto. Braço esquerdo é</p><p>manga esquerda.</p><p>Cada manga é cobrada à parte.</p><p>```</p><p><strong>Imagem.</strong> Duas fotos lado a lado, com legenda clara em cada uma. Padronizar a caixa das legendas, que na peça atual estão em caixas diferentes.</p><hr><h4>Bloco 4 — Como o texto sai impresso</h4><p><strong>Copy</strong></p><p>```</p><p>COMO O TEXTO SAI</p><p>A fonte é sempre a Bebas Neue, em negrito e em letras maiúsculas.</p><p>Esse é o padrão da Juff e não pode ser alterado.</p><p>O texto fica centralizado na parte superior da peça, ou na barra</p><p>quando a camiseta tiver estampa nas costas.</p><p>```</p><p><strong>Imagem.</strong> Close no texto impresso, mostrando a fonte de perto.</p><hr><h4>Bloco 5 — Atenção</h4><blockquote><p><strong>Este bloco não existe na versão atual e é a maior fonte de reclamação hoje.</strong> Precisa de tratamento visual diferente dos outros, com destaque real, e não pode ficar no rodapé da arte.</p></blockquote><p><strong>Copy</strong></p><p>```</p><p>ANTES DE FECHAR O PEDIDO</p><p>Tudo sai em letra maiúscula. Mesmo que você digite em minúscula,</p><p>a impressão converte.</p><p>Emoji não imprime. O campo aceita o desenho, mas ele não sai na</p><p>camiseta.</p><p>Espaço conta como caractere.</p><p>Acento pode, sem problema.</p><p>Também valem @ . _ - / &amp; # e números.</p><p>Confira a digitação com calma. Produto personalizado não tem troca.</p><p>```</p><p><strong>Imagem.</strong> Sem foto. Este bloco pede tratamento gráfico, com ícone de atenção e fundo contrastante.</p><hr><h4>Bloco 6 — Cor da personalização nas camisetas lisas</h4><p><strong>Copy</strong></p><p>```</p><p>A COR DO TEXTO NAS LISAS</p><p>Cada cor de camiseta tem uma cor de texto definida. Confira a sua</p><p>na cartela.</p><p>Cor nova que ainda não apareça aqui segue a regra. Tom claro leva</p><p>texto preto, tom médio ou escuro leva texto branco.</p><p>```</p><p><strong>Imagem.</strong> Cartela completa com as 24 cores da seção 5 deste briefing.</p><hr><h4>Bloco 7 — Cor da personalização nas estampadas</h4><p><strong>Copy</strong></p><p>```</p><p>A COR DO TEXTO NAS ESTAMPADAS</p><p>Nas camisetas estampadas o texto acompanha a cor de maior destaque</p><p>da estampa.</p><p>Essa cor não é escolhida pelo cliente. Se ficar em dúvida, chame a</p><p>gente antes de fechar o pedido.</p><p>```</p><p><strong>Imagem.</strong> Duas fotos da mesma peça estampada, frente e costas, mostrando o texto na cor puxada da estampa.</p><hr><h4>Bloco 8 — Prazo</h4><p><strong>Copy</strong></p><p>```</p><p>PRAZO DE PRODUÇÃO</p><p>A peça personalizada leva 3 dias a mais que a peça lisa. Esse prazo</p><p>entra antes do frete.</p><p>```</p><p><strong>Imagem.</strong> Sem foto. Ícone simples.</p><hr><h4>Bloco 9 — Errou na digitação</h4><p><strong>Copy</strong></p><p>```</p><p>ERROU ALGUMA LETRA?</p><p>Enquanto a peça não foi para a impressão, ainda dá para ajustar.</p><p>Chame no WhatsApp o quanto antes.</p><p>WhatsApp (11) 3961-2696, de segunda a sexta, das 9h às 17h.</p><p>Depois de impressa não tem como voltar atrás.</p><p>```</p><blockquote><p><strong>Atenção da redação.</strong> Não colocar prazo em horas nesta arte. A produção já imprimiu pedido em menos de 4 horas, então qualquer número vira promessa que a operação pode não cumprir.</p></blockquote><p><strong>Imagem.</strong> Sem foto. Ícone do WhatsApp obrigatório ao lado do número, porque o número é fixo e o cliente não reconhece fixo como WhatsApp.</p><hr><h4>Bloco 10 — Troca e devolução</h4><p><strong>Copy</strong></p><p>```</p><p>TROCA E DEVOLUÇÃO</p><p>Produto personalizado não entra em troca ou devolução, conforme o</p><p>artigo 49 do Código de Defesa do Consumidor.</p><p>Erro de digitação não é considerado defeito.</p><p>Defeito de fabricação continua coberto normalmente.</p><p>```</p><hr><h4>Bloco 11 — Termos proibidos</h4><p><strong>Copy</strong></p><p>```</p><p>O QUE NÃO PODE SER IMPRESSO?</p><p>Não use nomes de times, marcas registradas, termos protegidos por direitos</p><p>autorais ou expressões ofensivas.</p><p>A Juff poderá recusar personalizações fora dessas regras.</p><p>```</p><hr><h4>Bloco 12 — Contato</h4><p><strong>Copy</strong></p><p>```</p><p>AINDA COM DÚVIDA?</p><p>WhatsApp (11) 3961-2696, de segunda a sexta, das 9h às 17h.</p><p>E-mail loja@juff.com.br</p><p>```</p><p><strong>Hierarquia.</strong> WhatsApp em destaque, e-mail em tamanho menor logo abaixo. A peça atual divulga apenas e-mail em dois pontos diferentes, e o e-mail é o canal mais lento para salvar um pedido antes da impressão.</p><hr><h3>5. Cartela de cores</h3><p>São <strong>24 cores</strong> no total. As 17 primeiras são a linha atual, as demais seguem à venda no Outlet e continuam personalizáveis. <strong>Não separar Outlet do restante na arte.</strong></p><h4>5.1 Camisetas que levam texto BRANCO</h4><p>Cor da camiseta Cor do texto Vermelho BRANCO Verde Militar BRANCO Cinza Chumbo BRANCO Cinza Claro BRANCO Fúcsia BRANCO Roial BRANCO Bordô BRANCO Roxo BRANCO Marinho BRANCO Azul Índigo BRANCO Preto BRANCO Rosa Flúor BRANCO Rosa Pop BRANCO Verde Bandeira BRANCO Roxo Ultra BRANCO Turquesa BRANCO Pink BRANCO</p><h4>5.2 Camisetas que levam texto PRETO</h4><p>Cor da camiseta Cor do texto Laranja PRETO Laranja Ultra PRETO Amarelo PRETO Amarelo Flúor PRETO Branco PRETO Verde Água PRETO Menta PRETO</p><h4>5.3 Regras da cartela</h4><ul><li><p><strong>O nome de cada cor deve aparecer na cartela exatamente na cor em que o texto será impresso.</strong> Se a camiseta leva texto branco, o nome na amostra é branco.</p></li><li><p><strong>Cinza Claro</strong> leva texto BRANCO, mesmo tendo nome de tom claro. Posicionar visualmente junto dos tons médios e escuros para não parecer contradição.</p></li><li><p><strong>Roial fica escrito assim mesmo.</strong> A grafia correta seria <em>royal</em>, mas o site usa <em>roial</em> e a arte precisa bater com o site para o cliente encontrar a cor. <strong>Não corrigir.</strong></p></li><li><p><strong>Azul Índigo</strong> leva acento no í.</p></li><li><p><strong>Menta</strong> é o nome correto. Não escrever <em>Verde Menta</em>.</p></li><li><p><strong>Rosa Pop</strong> e <strong>Cinza Claro</strong> são novidades e não existem na peça atual.</p></li><li><p>Puxar as amostras direto dos arquivos de cor do site para garantir fidelidade.</p></li></ul><hr><h3>6. Fotos necessárias</h3><p>A peça pede fotografia de pessoa real, não mockup plano. Lista mínima.</p><ul><li><p>Costas com uma linha de texto.</p></li><li><p>Costas com duas linhas de texto.</p></li><li><p>Frente com texto na parte superior.</p></li><li><p>Peça com estampa nas costas e texto na barra.</p></li><li><p>Manga direita, em pessoa vestindo.</p></li><li><p>Manga esquerda, em pessoa vestindo.</p></li><li><p>Camiseta estampada com o texto acompanhando a cor da estampa.</p></li><li><p>Close do texto impresso, para mostrar a fonte.</p></li></ul><p>Diversidade de tons de pele, corpos e cores de camiseta ao longo da peça. Preferir fotos onde o texto esteja nítido e legível, já que não existe simulação no site e esta é a única referência do cliente.</p><hr><hr><h3>8. Checklist antes de mandar para aprovação</h3><ul><li><p>[ ] Abrir no celular e o essencial se lê de primeira, sem zoom.</p></li><li><p>[ ] O bloco de atenção, os limites de caracteres e os nomes das cores estão em corpo confortável.</p></li><li><p>[ ] As 24 cores estão na cartela, com o nome na cor de impressão correta.</p></li><li><p>[ ] O limite aparece como 20 caracteres em todos os lugares onde é citado.</p></li><li><p>[ ] O bloco de atenção está em destaque e não no rodapé.</p></li><li><p>[ ] O WhatsApp aparece com ícone e antes do e-mail.</p></li><li><p>[ ] Nenhum prazo em horas para correção de pedido.</p></li><li><p>[ ] O arquivo está abaixo de 1,5 MB em JPG OU PNG.</p></li></ul>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'A fazer' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Juff Store' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'Demanda Setembro - Instruções de personalização'
  );

-- Juff Store, Planejamento, Turbinar Posts
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'Turbinar Posts', $juff$<p>10 a 25 ago turbinado da Isa video generico</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Juff Store' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'Turbinar Posts'
  );

-- Marketing Interno, Planejamento, LISTA VIP JUNHO - NIVER JUFF
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'LISTA VIP JUNHO - NIVER JUFF', $juff$<p>Show. Cupom dentro do banner também. Versão final:</p><hr><p><strong>TEMPLATE 1 — Sexta (disparo 10h)</strong></p><p>CATEGORIA: Marketing</p><p>NOME: juff_store_vip50_sexta</p><p>CABEÇALHO: Imagem (JUFF 22 ANOS / 50% OFF PRO VIP / cupom JUFFNIVERVIP)</p><p>CORPO:</p><p><em>A Juff faz 22 anos e o presente é seu</em> 🎉</p><p>Olá, {{1}}! Como você é VIP, são <em>50% em toda a loja</em> até domingo, com o cupom <em>JUFFNIVERVIP</em> no carrinho. Não guarda esse presente da Juff só pra você, encaminha essa mensagem pros amigos aproveitarem esse presente também.</p><p>RODAPÉ: Responda #SAIR para não receber ofertas.</p><p>BOTÕES:</p><ul><li><p>Link → "Ver na loja" → <a href="https://loja.juff.com.br" target="_blank" rel="noopener">https://loja.juff.com.br</a></p></li><li><p>Resposta rápida → "Me ajuda a escolher"</p></li></ul><p>VARIÁVEIS:</p><ul><li><p>{{1}} = Camila</p></li></ul><hr><p><strong>TEMPLATE 2 — Sábado (disparo 10h)</strong></p><p>CATEGORIA: Marketing</p><p>NOME: juff_store_vip50_sabado</p><p>CABEÇALHO: Imagem (JUFF 22 ANOS / 50% OFF PRO VIP / CORRE QUE TÁ ACABANDO / cupom JUFFNIVERVIP)</p><p>CORPO:</p><p><em>O presente de 22 anos da Juff vai até domingo</em> 🎉</p><p>Olá, {{1}}! O sábado pede um café sem pressa, e é uma boa hora pra escolher com calma. Os <em>50% de VIP</em> continuam de pé até amanhã, com o cupom <em>JUFFNIVERVIP</em> no carrinho. Encaminha essa mensagem pros seus amigos para eles aproveitarem também.</p><p>RODAPÉ: Responda #SAIR para não receber ofertas.</p><p>BOTÕES:</p><ul><li><p>Link → "Ver na loja" → <a href="https://loja.juff.com.br" target="_blank" rel="noopener">https://loja.juff.com.br</a></p></li><li><p>Resposta rápida → "Me ajuda a escolher"</p></li></ul><p>VARIÁVEIS:</p><ul><li><p>{{1}} = Camila</p></li></ul>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'LISTA VIP JUNHO - NIVER JUFF'
  );

-- Marketing Interno, Planejamento, PARA FUTUROS ENSAIOS FOTOGRÁFICOS DE ESTÚDIO
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'PARA FUTUROS ENSAIOS FOTOGRÁFICOS DE ESTÚDIO', $juff$<p>Pré-requisitos para ensaios fotográficos da Juff</p><ul><li><p>Tamanho mínimo na altura 6000 Pixels (para fotos na vertical)</p></li><li><p>Fotos de LookBook/Ecommerce precisam estar com alta definição para recortes do photoshop. Ou seja quando damos o zoom na camiseta com o fundo o recorte precisa ser perfeito não pode estar embaçado ou com efeito de desfoque.</p></li><li><p>Fotos de look Book/Ecommerce precisam estar com o balanço de branco correto para não causar distorção de cor na hora da edição.</p></li></ul><p>[anexo de imagem ficou no Trello]</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'PARA FUTUROS ENSAIOS FOTOGRÁFICOS DE ESTÚDIO'
  );

-- Marketing Interno, Planejamento, UV DOS TECIDOS LABORATORIO
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'UV DOS TECIDOS LABORATORIO', $juff$<p><a href="https://allergisa.com.br/fator-de-protecao-ultravioleta-em-tecidos.php?utm_source=chatgpt.com" target="_blank" rel="noopener">https://allergisa.com.br/fator-de-protecao-ultravioleta-em-tecidos.php?utm_source=chatgpt.com</a></p><p>MANDEI EMAIL DIA 8/4</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'UV DOS TECIDOS LABORATORIO'
  );

-- Juff Store, Planejamento, duvidas wbuy
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'duvidas wbuy', $juff$<p>1 - É possível inativar apenas uma variação especifica (cor ou tamanho) em um produto e ele continuar ativo no site com exceção daquela variação só naquele produto especifico?</p><p>2 -A W buy aceita plugins externos?</p><p>3 -</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Juff Store' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'duvidas wbuy'
  );

-- Marketing Interno, Planejamento, LINKS
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'LINKS', $juff$<p><a href="https://videotoframes.com/pt" target="_blank" rel="noopener">https://videotoframes.com/pt</a></p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'LINKS'
  );

-- Marketing Interno, Planejamento, IDEIAS E MATERIAIS PARA EVENTOS
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'IDEIAS E MATERIAIS PARA EVENTOS', $juff$<p>Os materiais promocionais com cupons devem permitir ativação apenas uma vez por CPF, sem validade determinada.</p><p>Traga sua camiseta ou peça de roupa velha e ganhe uma juff novinha. Você ajuda e ainda se sente confortável.</p><p>Máquina de vendas de camisetas.</p><p>Água nos eventos: ponto de hidratação juff.</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'IDEIAS E MATERIAIS PARA EVENTOS'
  );

-- Juff Custom, Planejamento, Montar e organizar COMERCIAL material fisico para JUFF CUSTOM
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'Montar e organizar COMERCIAL material fisico para JUFF CUSTOM', $juff$<p>A Juff Custom precisa de material físico para que o departamento comercial agende reuniões com grandes clientes, como a Lacoste.</p><p>Podemos fechar com eles em todos os eventos?</p><p>É fundamental alinhar com quem ficará responsável, pois os vendedores não podem marcar reuniões longas e perder uma manhã inteira.</p><p>Uma sugestão importante é verificar com Flavio e Juliana quem ficará responsável por esse cliente. Uma possibilidade é criar uma categoria “Juff Todos”, onde o responsável pelo pedido recebe a comissão. Outra opção é que o vendedor com menor desempenho faça o pedido, dividindo a comissão entre todos ou destinando-a a Flavio ou a um caixa da Juff Comercial para futuras ações ou premiações. É fundamental encontrar uma solução que seja considerada justa para todos, a fim de evitar conflitos futuros na equipe.</p><p>Materiais interessantes para ter:</p><ul><li><p>Folder</p></li><li><p>Apresentação</p></li><li><p>Cartão de visita</p></li><li><p>Brinde</p></li></ul>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Juff Custom' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'Montar e organizar COMERCIAL material fisico para JUFF CUSTOM'
  );

-- Parcerias, Planejamento, email da parceria - arte
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'email da parceria - arte', $juff$<p>Van precisamos de um email simples, vou explicar o que é:</p><p>Teremos algumas lojas parceiras, e para isso eas entram em uma landing page e fecham um contrato com a gente.</p><p>Se quiser ver a LP esta aqui:</p><p><a href="https://camisetas.juff.com.br/parceiros_juffstore" target="_blank" rel="noopener">https://camisetas.juff.com.br/parceiros_juffstore</a></p><p>depois que a pessoa preenche ela recebe um email que esta atualmente assim: <a href="https://trello.com/1/cards/68506d4fe0f94b22f9c4cd0f/attachments/6851700e613c0c10dd2d1e7f/download/screencapture-app-rdstation-br-emails-preview-2025-06-17-10_39_04.pdf" target="_blank" rel="noopener">screencapture-app-rdstation-br-emails-preview-2025-06-17-10_39_04.pdf</a></p><p>Precisamos de um email mais bonitinho, a parte do contrato não precisa é mais essa parte de cima para não ficar tão Pessoa Jurídica sabe? Pode ser menor. A parte de baixo eu vou alterar ainda entao nao se preocupe com ela é mais a parte de cima mesmo onde tem o titulo, uma imagem mesmo com esse titulo ou se vc tiver alguma outra ideia manda pra gente. bjs</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Parcerias' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'email da parceria - arte'
  );

-- Marketing Interno, Planejamento, PEDIR ORÇAMENTO PARA SUBSTITUIÇÃO DOS LOGOS DA JUFF DA ENTRADA. PORTA E PAINEL DE MADEIRA.
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'PEDIR ORÇAMENTO PARA SUBSTITUIÇÃO DOS LOGOS DA JUFF DA ENTRADA. PORTA E PAINEL DE MADEIRA.', $juff$<p><a href="https://www.arcasign.com.br/letraselogotipoempvcexpandido" target="_blank" rel="noopener">https://www.arcasign.com.br/letraselogotipoempvcexpandido</a></p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'PEDIR ORÇAMENTO PARA SUBSTITUIÇÃO DOS LOGOS DA JUFF DA ENTRADA. PORTA E PAINEL DE MADEIRA.'
  );

-- Juff Store, A fazer, Verificar se a Regata Cross está como kit na Olist
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'Verificar se a Regata Cross está como kit na Olist', $juff$<p>pRECISA VERIFICAR SE REGATA CROSS ( JUFF STORE - REGATA CROSS) NA OLIST É UM PRODUTO DE KIT… se nao for tem que trocar URGENTE!</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'A fazer' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Juff Store' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'Verificar se a Regata Cross está como kit na Olist'
  );

-- Marketing Interno, Em Andamento, acompanhamento mês 1
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'acompanhamento mês 1', $juff$<p>Bom dia Celso, tudo bem?</p><p>Como o projeto começou de fato no dia 1º de setembro, queremos fazer no dia 1º de outubro a verificação das entregas do Mês 1, conforme o cronograma do contrato.</p><p>Segue a lista do que vamos olhar juntos, para ficar fácil organizar as evidências de cada item (prints, testes ou registro no Notion)</p><p>1.⁠ ⁠sGTM implementado na Wascer, com a conta no nome da Juff</p><p>2.⁠ ⁠Data Client do sGTM configurado e webhook do RD Station funcionando</p><p>3.⁠ ⁠Supabase unificando os dados da Tray e do RD Station</p><p>4.⁠ ⁠Envio do site para o servidor (cGTM para sGTM) com cookies de sessão</p><p>5.⁠ ⁠GA4 organizado por frente, Varejo e Atacado</p><p>6.⁠ ⁠Pixel da Meta revisado, sem duplicidade, e UTM persistindo</p><p>7.⁠ ⁠Jornada da loja Tray com Advanced Matching (ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo e Purchase)</p><p>8.⁠ ⁠Google Ads e Meta Ads separados entre Varejo e Atacado</p><p>9.⁠ ⁠Erros da aba Diagnóstico da Meta corrigidos</p><p>10.⁠ ⁠Tag global do Google Ads revisada com dados fornecidos pelo usuário</p><p>11.⁠ ⁠Rastreamento de botões e cliques no GA4 revisado</p><p>Você acha que até o dia 1º conseguimos ter esse material em mãos? Assim validamos com tranquilidade e já seguimos para o Mês 2.</p><p>E se algum item depender da gente (acessos, VPS, subdomínio), me avisa que priorizamos por aqui.</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Em Andamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'acompanhamento mês 1'
  );

-- Juff Store, Planejamento, BLITZ JUFF STORE
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'BLITZ JUFF STORE', $juff$<p>Ver possibilidade da Juff fazer blitz em portas de universidades ou bares e em locais com pessoas mais jovens que praticam ou nao esportes.</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Juff Store' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'BLITZ JUFF STORE'
  );

-- Marketing Interno, Planejamento, VERIFICAR - Logística reversa de embalagens pós-consumo
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'VERIFICAR - Logística reversa de embalagens pós-consumo', $juff$<p>Nu, recebi contato de uma empresa a respeito de logística reversa de embalagens pós consumo…parece que é lei. Não tenho certeza. Precisamos dar uma olhada nisso.</p><p><a href="https://www.eureciclo.com.br/" target="_blank" rel="noopener">https://www.eureciclo.com.br/</a></p><hr>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'VERIFICAR - Logística reversa de embalagens pós-consumo'
  );

-- Marketing Interno, Planejamento, CRITEO
insert into public.tarefa_cards (quadro_id, coluna_id, titulo, descricao, posicao, criado_por, responsavel_id)
select q.id, c.id, 'CRITEO', $juff$<p>ver com a criteo sobre anuncios</p><p><strong>Assunto:</strong> Interesse em apresentação da plataforma Criteo – Juff Sportswear</p><p><strong>Corpo do e-mail:</strong></p><p>Olá, tudo bem?</p><p>Meu nome é Nuno, sou diretor de marketing na Juff Sportswear, marca de vestuário esportivo com forte atuação no e-commerce nacional.</p><p>Estamos avaliando novas plataformas de mídia programática para complementar nossas campanhas de performance (atualmente em Google e Meta), com foco em <strong>remarketing dinâmico e conversão em ambientes fora dos walled gardens</strong>.</p><p>Gostaria de agendar uma apresentação da Criteo para entender melhor a proposta, funcionalidades e condições para um piloto inicial com verba reduzida.</p><p>Fico no aguardo para alinharmos data e horário.</p><p>Desde já, agradeço.</p><p>Atenciosamente,</p><p><strong>Nuno</strong></p><p>Diretor de Marketing – Juff Sportswear</p><p>[telefone ou WhatsApp]</p><p>[site da Juff se quiser incluir]</p>$juff$,
       coalesce((select max(x.posicao) + 1 from public.tarefa_cards x where x.coluna_id = c.id), 0),
       p.id, p.id
from public.tarefa_quadros q
join public.tarefa_colunas c on c.quadro_id = q.id and c.nome = 'Planejamento' and c.arquivado = false
join public.profiles p on p.email = 'marketing@juff.com.br'
where q.nome = 'Marketing Interno' and q.arquivado = false
  and not exists (
    select 1 from public.tarefa_cards y
    where y.quadro_id = q.id and y.titulo = 'CRITEO'
  );

-- =====================================================================
-- BLOCO 5, etiqueta ADIADO nos 6 cards que vinham da lista Adiado
-- =====================================================================

insert into public.tarefa_card_etiquetas (card_id, etiqueta_id)
select t.id, e.id
from public.tarefa_cards t
join public.tarefa_quadros q on q.id = t.quadro_id
cross join lateral (
  select id from public.tarefa_etiquetas
  where quadro_id is null and upper(trim(nome)) = 'ADIADO'
  limit 1
) e
where t.arquivado = false
  and (q.nome, t.titulo) in (
        ('Marketing Interno', 'IDEIAS E MATERIAIS PARA EVENTOS'),
        ('Juff Custom', 'Montar e organizar COMERCIAL material fisico para JUFF CUSTOM'),
        ('Parcerias', 'email da parceria - arte'),
        ('Marketing Interno', 'PEDIR ORÇAMENTO PARA SUBSTITUIÇÃO DOS LOGOS DA JUFF DA ENTRADA. PORTA E PAINEL DE MADEIRA.'),
        ('Marketing Interno', 'VERIFICAR - Logística reversa de embalagens pós-consumo'),
        ('Marketing Interno', 'CRITEO')
      )
  and not exists (
    select 1 from public.tarefa_card_etiquetas x
    where x.card_id = t.id and x.etiqueta_id = e.id
  );

-- =====================================================================
-- BLOCO 6, religar o aviso de card atribuído
-- =====================================================================

alter table public.tarefa_cards enable trigger notificar_atribuicao;