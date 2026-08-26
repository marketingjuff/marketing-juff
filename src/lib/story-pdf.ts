import type { Story } from "@/lib/stories";
import type { Objective } from "@/lib/objectives";

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

function capa(totalArtes: number, quantidade: number, objetivos: Objective[], todos: boolean): string {
  return `INSTRUÇÕES PARA MONTAR O PLANO DE STORIES

Este PDF contém as artes de stories da Juff Store. Cada página traz uma arte e o nome exato do arquivo dela.

Este PDF tem ${totalArtes} artes. Monte um plano com aproximadamente ${quantidade} stories, selecionando as melhores. Você não precisa usar todas.

Defina a ordem de publicação e agrupe as artes que devem ser publicadas juntas. Um bloco pode ser SOLO, com uma arte só, ou CAMPANHA, com duas ou três artes publicadas no mesmo momento e na ordem indicada. Um bloco nunca pode ter mais de cinco artes.

Alterne produto, benefício, vida real, marca, interação e venda. Evite sequência longa de frases conceituais parecidas.

Devolva a resposta em um documento Word seguindo EXATAMENTE o formato abaixo. Não use tabelas. Não use marcadores. Não escreva nenhum texto fora do formato. Cada linha começa com BLOCO, ARTE ou SOBRA, e os campos são separados por barra vertical.

BLOCO | numero | SOLO ou CAMPANHA | nome do bloco | objetivo
ARTE | nome exato do arquivo | texto principal | observação | recurso
SOBRA | nome exato do arquivo | motivo curto

O campo recurso aceita apenas um destes valores.
Nenhum, Link, Enquete, Menção, Slider, Caixa de pergunta.

Exemplo.

BLOCO | 1 | CAMPANHA | AQUELA QUE VOCÊ REPETE | Prova social
ARTE | prancheta 2 | AQUELA QUE VOCÊ REPETE. | Arte limpa, sem CTA. | Nenhum
ARTE | prancheta 3 | THERMOAIR. VOCÊ VAI ENTENDER QUANDO VESTIR. | Leve, respirável e feita para acompanhar. CTA CONHEÇA A JUFF | Link
BLOCO | 2 | SOLO | DESACELERAR | Marca
ARTE | prancheta 4 | HOJE O MOVIMENTO É DESACELERAR. | Sem CTA. | Nenhum
SOBRA | prancheta 5 | Repete a mesma ideia da prancheta 4.
SOBRA | prancheta 6 | Texto pouco legível sobre a foto.

Depois das linhas do plano, escreva uma linha SOBRA para CADA arte que você decidiu não usar. Toda arte deste PDF precisa aparecer uma vez, ou como ARTE ou como SOBRA. Nenhuma pode ficar de fora das duas listas. Não invente artes que não estão no PDF.${blocoObjetivos(objetivos, todos)}`;
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
    capa(frames.length, quantidade, objetivos, todosObjetivos),
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
