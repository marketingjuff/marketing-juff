/**
 * Guia de publicação que vai dentro do zip de imagens.
 * Layout denso, duas colunas por dez linhas, vinte artes por página A4.
 */

export type ItemGuia = {
  /** Nome exato do arquivo dentro do zip. */
  arquivo: string;
  /** Arte já montada com texto e logo, a mesma que foi para o zip. */
  blob: Blob;
  nomeBloco: string;
  posicaoNoBloco: number;
  totalDoBloco: number;
  cta: string;
  link: string;
};

const MARGEM = 10;
const COLUNAS = 2;
const LINHAS = 10;
const LARGURA_COLUNA = 92;
const GUTTER = 6;
const ALTURA_CELULA = 26;
const TOPO_GRADE = 24;

const MINIATURA_ALTURA = 23;
const MINIATURA_LARGURA = 13;
const TEXTO_OFFSET = MINIATURA_LARGURA + 3;
const TEXTO_LARGURA = LARGURA_COLUNA - TEXTO_OFFSET - 2;

/** Reduz a arte para uma miniatura leve, para o PDF não ficar gigante. */
async function miniatura(blob: Blob): Promise<{ dataUrl: string; prop: number }> {
  const bitmap = await createImageBitmap(blob);
  const alvo = 180;
  const escala = bitmap.width > alvo ? alvo / bitmap.width : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a miniatura");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const prop = bitmap.width / bitmap.height;
  bitmap.close?.();
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.55), prop: prop > 0 ? prop : 9 / 16 };
}

/** Corta o texto em no máximo `maxLinhas` linhas, com reticências na última. */
function limitar(
  doc: { splitTextToSize: (t: string, w: number) => string[] },
  texto: string,
  largura: number,
  maxLinhas: number,
): string[] {
  const linhas = doc.splitTextToSize(texto, largura);
  if (linhas.length <= maxLinhas) return linhas;
  const cortadas = linhas.slice(0, maxLinhas);
  const ultima = cortadas[maxLinhas - 1] ?? "";
  cortadas[maxLinhas - 1] = `${ultima.slice(0, Math.max(0, ultima.length - 3))}...`;
  return cortadas;
}

/** Monta o guia e devolve o PDF pronto para entrar no zip. */
export async function montarGuiaPdf(itens: ItemGuia[], nomeProjeto: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageH = doc.internal.pageSize.getHeight();

  const porPagina = COLUNAS * LINHAS;
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const dataHora = new Date().toLocaleString("pt-BR");

  const cabecalho = (pagina: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Guia de publicação. ${nomeProjeto}`, MARGEM, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `${itens.length} ${itens.length === 1 ? "arte" : "artes"}. Exportado em ${dataHora}. Página ${pagina} de ${totalPaginas}.`,
      MARGEM,
      19,
    );
    doc.setDrawColor("#cccccc");
    doc.line(MARGEM, 21, 210 - MARGEM, 21);
  };

  cabecalho(1);

  let indiceNaPagina = 0;
  let pagina = 1;

  for (let i = 0; i < itens.length; i += 1) {
    const item = itens[i]!;

    if (indiceNaPagina >= porPagina) {
      doc.addPage();
      pagina += 1;
      indiceNaPagina = 0;
      cabecalho(pagina);
    }

    const coluna = indiceNaPagina % COLUNAS;
    const linha = Math.floor(indiceNaPagina / COLUNAS);
    const x = MARGEM + coluna * (LARGURA_COLUNA + GUTTER);
    const y = TOPO_GRADE + linha * ALTURA_CELULA;

    try {
      const mini = await miniatura(item.blob);
      const largura = Math.min(MINIATURA_LARGURA, MINIATURA_ALTURA * mini.prop);
      const altura = largura / mini.prop;
      doc.addImage(mini.dataUrl, "JPEG", x, y, largura, altura);
    } catch {
      doc.setDrawColor("#cccccc");
      doc.rect(x, y, MINIATURA_LARGURA, MINIATURA_ALTURA);
    }

    const tx = x + TEXTO_OFFSET;
    let ty = y + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const titulo = `${i + 1}. ${item.nomeBloco || "Sem nome do bloco"}${
      item.totalDoBloco > 1 ? ` (${item.posicaoNoBloco} de ${item.totalDoBloco})` : ""
    }`;
    for (const l of limitar(doc, titulo, TEXTO_LARGURA, 1)) {
      doc.text(l, tx, ty);
      ty += 3.6;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor("#666666");
    for (const l of limitar(doc, item.arquivo, TEXTO_LARGURA, 1)) {
      doc.text(l, tx, ty);
      ty += 4;
    }

    doc.setTextColor("#000000");
    doc.setFontSize(7);
    const textoCta = item.cta ? `CTA. ${item.cta}` : "CTA. sem CTA nesta arte";
    for (const l of limitar(doc, textoCta, TEXTO_LARGURA, 1)) {
      doc.text(l, tx, ty);
      ty += 3.6;
    }

    const textoLink = item.link ? `Link. ${item.link}` : "Link. sem link";
    for (const l of limitar(doc, textoLink, TEXTO_LARGURA, 2)) {
      doc.text(l, tx, ty);
      ty += 3.4;
    }

    doc.setDrawColor("#eeeeee");
    doc.line(x, y + ALTURA_CELULA - 2, x + LARGURA_COLUNA, y + ALTURA_CELULA - 2);

    indiceNaPagina += 1;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor("#999999");
  doc.text("Copie o CTA e o link deste guia direto para o Meta Business Suite.", MARGEM, pageH - 5);
  doc.setTextColor("#000000");

  return doc.output("blob");
}
