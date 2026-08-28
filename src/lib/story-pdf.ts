import type { Story } from "@/lib/stories";
import type { Objective } from "@/lib/objectives";
import type { Cta, LinkCta } from "@/lib/story-ctas";

function blocoObjetivos(objetivos: Objective[], todos: boolean): string {
  if (objetivos.length === 0) return "";
  const lista = objetivos
    .map((o) => `${o.nome}\n${o.instrucao || "Sem instrução cadastrada."}`)
    .join("\n\n");
  const orientacao = todos
    ? "Distribua os stories livremente entre todos os objetivos listados abaixo."
    : "Use SOMENTE os objetivos listados abaixo. Não use nenhum outro objetivo.";
  return `

OBJETIVOS DOS STORIES

${orientacao}

Para cada bloco montado, identifique e informe o objetivo correspondente. O objetivo pertence ao story inteiro e entra na linha de BLOCO, como último campo, escrito exatamente com o nome do objetivo abaixo.

${lista}
`;
}

function blocoCtas(ctas: Cta[], links: LinkCta[]): string {
  if (ctas.length === 0 && links.length === 0) return "";

  const grupos = new Map<string, string[]>();
  for (const cta of ctas) {
    const lista = grupos.get(cta.grupo) ?? [];
    lista.push(cta.texto);
    grupos.set(cta.grupo, lista);
  }
  const listaCtas = [...grupos.entries()]
    .map(([grupo, frases]) => `${grupo}\n${frases.join("\n")}`)
    .join("\n\n");

  const listaLinks = links
    .map((l) => `${l.nome}\n${l.url}\n${l.descricao || "Sem orientação cadastrada."}`)
    .join("\n\n");

  return `

CTA E LINK

Os stories são publicados pelo Meta Business Suite, que pede duas informações por arte, a frase do botão, chamada de CTA, e o endereço de destino, chamado de link.

O campo cta aceita SOMENTE uma das frases listadas abaixo, copiada exatamente como está escrita, com a mesma pontuação e as mesmas maiúsculas. Não invente frase nova, não adapte, não junte duas. Quando a arte não levar CTA, deixe o campo vazio.

Sempre que o campo cta estiver preenchido, o campo link também precisa vir preenchido, com um dos endereços listados abaixo, copiado exatamente. Escolha o endereço que combina com a frase escolhida e com o assunto da arte. Quando o campo cta estiver vazio, o campo link também fica vazio.

Pelo menos 70 por cento dos blocos precisam levar CTA. Em bloco CAMPANHA, a última arte do bloco leva CTA e link obrigatoriamente, porque é ela que fecha a sequência.

FRASES DE CTA DISPONÍVEIS

${listaCtas || "Nenhuma frase cadastrada."}

LINKS DISPONÍVEIS

${listaLinks || "Nenhum link cadastrado."}
`;
}

function blocoDirecionamento(direcionamento: string): string {
  const texto = (direcionamento ?? "").trim();
  if (!texto) return "";
  return `

DIRECIONAMENTO DESTA LEVA

As orientações abaixo foram escritas por quem exportou este PDF e valem especificamente para este plano. Elas têm prioridade sobre a distribuição livre, mas nunca sobre o formato de resposta exigido acima. Se alguma orientação for impossível com as artes disponíveis, cumpra o que der e explique o que não deu em uma linha SOBRA.

${texto}
`;
}

function capa(
  totalArtes: number,
  quantidade: number,
  objetivos: Objective[],
  todos: boolean,
  direcionamento = "",
  ctas: Cta[] = [],
  links: LinkCta[] = [],
): string {
  return `INSTRUÇÕES PARA MONTAR O PLANO DE STORIES

Este PDF contém as artes de stories da Juff Store. Cada página traz uma arte e o nome exato do arquivo dela.

${
    quantidade > 0
      ? `Este PDF tem ${totalArtes} artes. Monte um plano com aproximadamente ${quantidade} stories, selecionando as melhores. Você não precisa usar todas.`
      : `Este PDF tem ${totalArtes} artes. Use TODAS as ${totalArtes} artes no plano, nenhuma pode ficar de fora. Monte a quantidade de stories que você achar melhor, agrupando as artes como fizer mais sentido.`
  }

Defina a ordem de publicação e agrupe as artes que devem ser publicadas juntas. Um bloco pode ser SOLO, com uma arte só, ou CAMPANHA, com duas ou três artes publicadas no mesmo momento e na ordem indicada. Um bloco nunca pode ter mais de cinco artes.

Alterne produto, benefício, vida real, marca, interação e venda. Evite sequência longa de frases conceituais parecidas.

Devolva a resposta em um documento Word seguindo EXATAMENTE o formato abaixo. Não use tabelas. Não use marcadores. Não escreva nenhum texto fora do formato. Cada linha começa com BLOCO, ARTE ou SOBRA, e os campos são separados por barra vertical.

BLOCO | numero | SOLO ou CAMPANHA | nome do bloco | objetivo
ARTE | nome exato do arquivo | texto principal | observação | cta | link${quantidade > 0 ? `\nSOBRA | nome exato do arquivo | motivo curto` : ""}

Exemplo.

BLOCO | 1 | CAMPANHA | AQUELA QUE VOCÊ REPETE | Prova social
ARTE | prancheta 2 | AQUELA QUE VOCÊ REPETE. | Abre a campanha, arte limpa. | |
ARTE | prancheta 3 | THERMOAIR. VOCÊ VAI ENTENDER QUANDO VESTIR. | Fecha a campanha levando para a loja. | Veja a coleção. | https://loja.juff.com.br
BLOCO | 2 | SOLO | DESACELERAR | Marca
ARTE | prancheta 4 | HOJE O MOVIMENTO É DESACELERAR. | Story de marca, sem CTA. | |
ARTE | prancheta 7 | SEU TIME COM A SUA CARA. | Personalização, atendimento por conversa. | Fale com nossa equipe | https://wa.me/551139612696${quantidade > 0 ? `\nSOBRA | prancheta 5 | Repete a mesma ideia da prancheta 4.\nSOBRA | prancheta 6 | Texto pouco legível sobre a foto.` : ""}

${
    quantidade > 0
      ? `Depois das linhas do plano, escreva uma linha SOBRA para CADA arte que você decidiu não usar. Toda arte deste PDF precisa aparecer uma vez, ou como ARTE ou como SOBRA. Nenhuma pode ficar de fora das duas listas. Não invente artes que não estão no PDF.`
      : `Toda arte deste PDF precisa aparecer no plano como uma linha ARTE, exatamente uma vez. Não escreva nenhuma linha SOBRA, porque nenhuma arte pode ficar de fora. Não invente artes que não estão no PDF.`
  }${blocoObjetivos(objetivos, todos)}${blocoCtas(ctas, links)}${blocoDirecionamento(direcionamento)}`;
}


async function prepararImagem(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const maior = Math.max(bitmap.width, bitmap.height);
  const scale = maior > 1200 ? 1200 / maior : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.75),
    width: canvas.width,
    height: canvas.height,
  };
}

/** Só entram as artes da fila principal; as não utilizadas ficam de fora. */
export async function exportPlanPdf(
  stories: Story[],
  nomeProjeto: string,
  quantidade: number,
  objetivos: Objective[] = [],
  todosObjetivos = true,
  direcionamento = "",
  ctas: Cta[] = [],
  links: LinkCta[] = [],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margem = 15;

  const frames = stories.filter((s) => !s.descartado).flatMap((s) => s.frames);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // As instruções podem passar de uma página; quebra automática por linha.
  const linhas: string[] = doc.splitTextToSize(
    capa(frames.length, quantidade, objetivos, todosObjetivos, direcionamento, ctas, links),
    pageW - margem * 2,
  );
  const alturaLinha = 5;
  let cy = margem + 5;
  for (const linha of linhas) {
    if (cy > pageH - margem) {
      doc.addPage();
      cy = margem + 5;
    }
    doc.text(linha, margem, cy);
    cy += alturaLinha;
  }


  for (const frame of frames) {
    if (!frame.url) continue;
    doc.addPage();
    const img = await prepararImagem(frame.url);

    const rodapeAltura = 30;
    const maxW = pageW - margem * 2;
    const maxH = pageH - margem * 2 - rodapeAltura;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    doc.addImage(img.dataUrl, "JPEG", (pageW - w) / 2, margem, w, h);

    let y = margem + h + 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(frame.nome_arquivo || "Sem nome", margem, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    if (frame.texto_principal) {
      y += 7;
      doc.text(doc.splitTextToSize(frame.texto_principal, maxW), margem, y);
      y += 5;
    }
    if (frame.observacao) {
      y += 5;
      doc.text(doc.splitTextToSize(frame.observacao, maxW), margem, y);
    }
  }

  const slug = nomeProjeto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  doc.save(`stories-${slug || "area-de-trabalho"}.pdf`);
}
