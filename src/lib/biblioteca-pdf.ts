import { jsPDF } from "jspdf";
import JSZip from "jszip";
import {
  gerarVariacoes,
  nomePai,
  nomeCurto,
  ordenarTamanhos,
  type CorBiblioteca,
  type EstiloNome,
  type TamanhoOlist,
  type Medida,
  type ProdutoBiblioteca,
} from "@/lib/biblioteca";
import { ROTULO_GRUPO, type CorPaleta, type TextoMarca, type GrupoTexto } from "@/lib/biblioteca-marca";
import {
  FAMILIAS,
  POR_LINHA,
  ROTULO_FAMILIA,
  emLinhas,
  textoCmyk,
  type CorEstampa,
  type Familia,
} from "@/lib/biblioteca-estampa";

const MARGEM = 15;
const LARGURA = 210;
const ALTURA = 297;

/** jsPDF não desenha emoji. Guarda no sistema, tira só do papel. */
function limparTexto(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[^\u0000-\u024F\u2013\u2014\u2018\u2019\u201C\u201D]/g, "").trim();
}

function novoDoc(titulo: string, subtitulo: string): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(limparTexto(titulo), MARGEM, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(limparTexto(subtitulo), MARGEM, 28);
  doc.setTextColor(0);
  return doc;
}

function rodape(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Juff Sportswear", MARGEM, ALTURA - 10);
    doc.text(`${i} de ${total}`, LARGURA - MARGEM, ALTURA - 10, { align: "right" });
    doc.setTextColor(0);
  }
}

function quebra(doc: jsPDF, y: number, precisa: number): number {
  if (y + precisa > ALTURA - 20) {
    doc.addPage();
    return 25;
  }
  return y;
}

/** Preto ou branco por cima da cor, pelo mesmo critério usado nas telas. */
function textoSobre(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luz = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luz > 0.6 ? [20, 20, 20] : [255, 255, 255];
}

function grade(doc: jsPDF, cores: { nome: string; hex: string; nota?: string }[], yInicial: number) {
  const colunas = 3;
  const larguraCaixa = (LARGURA - MARGEM * 2 - 8) / colunas;
  const alturaCaixa = 22;
  let y = yInicial;

  cores.forEach((c, i) => {
    const col = i % colunas;
    if (col === 0) y = quebra(doc, y, alturaCaixa + 4);
    const x = MARGEM + col * (larguraCaixa + 4);

    doc.setFillColor(c.hex);
    doc.rect(x, y, larguraCaixa, alturaCaixa, "F");

    const [r, g, b] = textoSobre(c.hex);
    doc.setTextColor(r, g, b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(limparTexto(c.nome), x + 3, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(c.hex.toUpperCase(), x + 3, y + 14);
    if (c.nota) doc.text(limparTexto(c.nota), x + 3, y + 19);
    doc.setTextColor(0);

    if (col === colunas - 1) y += alturaCaixa + 4;
  });
}

// ---------------- Os PDFs ----------------

export function pdfPaleta(cores: CorPaleta[]): Blob {
  const oficiais = cores.filter((c) => c.ativo && !c.rascunho);
  const testes = cores.filter((c) => c.ativo && c.rascunho);

  const doc = novoDoc("Paleta do manual de marca", "Cores digitais. Não são cores de tecido.");
  grade(doc, oficiais.map((c) => ({ nome: c.nome, hex: c.hex })), 36);

  if (testes.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Cores em teste", MARGEM, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Ainda não aprovadas para uso oficial.", MARGEM, 28);
    doc.setTextColor(0);
    grade(doc, testes.map((c) => ({ nome: c.nome, hex: c.hex, nota: "em teste" })), 36);
  }

  rodape(doc);
  return doc.output("blob");
}

export function pdfCoresCamiseta(cores: CorBiblioteca[]): Blob {
  const doc = novoDoc("Cores de camiseta", "Cartela oficial de tecido. 26 cores.");
  grade(doc, cores.filter((c) => c.ativo).map((c) => ({ nome: c.nome, hex: c.hex })), 36);
  rodape(doc);
  return doc.output("blob");
}

export function pdfTextos(textos: TextoMarca[]): Blob {
  const doc = novoDoc("Frases e textos prontos", "Biblioteca de marca.");
  let y = 38;

  for (const grupo of ["frase", "infantil", "cta", "texto"] as GrupoTexto[]) {
    const lista = textos.filter((t) => t.grupo === grupo && t.ativo);
    if (!lista.length) continue;

    y = quebra(doc, y, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(limparTexto(ROTULO_GRUPO[grupo]), MARGEM, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    for (const t of lista) {
      if (t.titulo) {
        y = quebra(doc, y, 10);
        doc.setFont("helvetica", "bold");
        doc.text(limparTexto(t.titulo), MARGEM, y);
        doc.setFont("helvetica", "normal");
        y += 5;
      }
      const linhas = doc.splitTextToSize(limparTexto(t.texto), LARGURA - MARGEM * 2);
      y = quebra(doc, y, linhas.length * 5 + 3);
      doc.text(linhas, MARGEM, y);
      y += linhas.length * 5 + 3;
    }
    y += 4;
  }

  rodape(doc);
  return doc.output("blob");
}

export function pdfNomesProduto(
  p: ProdutoBiblioteca,
  cores: CorBiblioteca[],
  estilo: EstiloNome = "fantasia",
  tamanhosOlist: TamanhoOlist[] = [],
): Blob {
  const variacoes = gerarVariacoes(p, cores, estilo, tamanhosOlist);
  const doc = novoDoc(nomeCurto(p), `${nomePai(p, estilo)}. ${variacoes.length} variações.`);
  let y = 38;

  doc.setFontSize(9);
  for (const v of variacoes) {
    y = quebra(doc, y, 6);
    doc.setFont("helvetica", "normal");
    doc.text(limparTexto(v.nome), MARGEM, y);
    if (v.categoria === "Outlet") {
      doc.setTextColor(150);
      doc.text("Outlet", LARGURA - MARGEM, y, { align: "right" });
      doc.setTextColor(0);
    }
    y += 5;
  }

  rodape(doc);
  return doc.output("blob");
}

/** Um PDF só, com todos os produtos, cada um em página nova. */
export function pdfNomesTodos(
  produtos: ProdutoBiblioteca[],
  cores: CorBiblioteca[],
  estilo: EstiloNome = "fantasia",
  tamanhosOlist: TamanhoOlist[] = [],
): Blob {
  const rotulo = estilo === "olist" ? "Nomes originais da Olist" : "Nomes fantasia";
  const doc = novoDoc("Nomes de produto", rotulo);
  let primeiro = true;

  for (const p of produtos) {
    const comCabecalho = primeiro;
    if (!primeiro) doc.addPage();
    primeiro = false;

    // A primeira página tem título e subtítulo em cima; as outras não.
    let y = comCabecalho ? 38 : 25;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(limparTexto(nomePai(p, estilo)), MARGEM, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const v of gerarVariacoes(p, cores, estilo, tamanhosOlist)) {
      y = quebra(doc, y, 6);
      doc.text(limparTexto(v.nome), MARGEM, y);
      if (v.categoria === "Outlet") {
        doc.setTextColor(150);
        doc.text("Outlet", LARGURA - MARGEM, y, { align: "right" });
        doc.setTextColor(0);
      }
      y += 5;
    }
  }

  rodape(doc);
  return doc.output("blob");
}

export function pdfMedidasProduto(p: ProdutoBiblioteca, medidas: Medida[]): Blob {
  const doc = novoDoc(`Medidas ${nomeCurto(p)}`, "Medidas em centímetros.");
  const tamanhos = ordenarTamanhos(p.tamanhos);
  const pontos = p.pontos;
  const achar = (ponto: string, t: string) =>
    medidas.find((m) => m.ponto === ponto && m.tamanho === t);

  let y = 40;

  const bloco = (titulo: string, completo: boolean) => {
    y = quebra(doc, y, 20 + tamanhos.length * 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(limparTexto(titulo), MARGEM, y);
    y += 7;

    const colunas = pontos.length + 1;
    const larguraCol = (LARGURA - MARGEM * 2) / colunas;

    doc.setFontSize(9);
    doc.text("Tamanho", MARGEM, y);
    pontos.forEach((pt, i) => {
      doc.text(limparTexto(pt), MARGEM + larguraCol * (i + 1), y);
    });
    y += 5;
    doc.setDrawColor(200);
    doc.line(MARGEM, y - 3, LARGURA - MARGEM, y - 3);

    doc.setFont("helvetica", "normal");
    for (const t of tamanhos) {
      doc.text(t, MARGEM, y);
      pontos.forEach((pt, i) => {
        const m = achar(pt, t);
        let texto = "";
        if (m) {
          texto = completo
            ? [m.minimo, m.alvo, m.maximo].map((n) => (n === null ? "" : String(n))).join("  ")
            : m.alvo === null
              ? ""
              : String(m.alvo);
        }
        doc.text(texto, MARGEM + larguraCol * (i + 1), y);
      });
      y += 6;
    }
    y += 8;
  };

  bloco("Tabela do cliente", false);
  bloco("Tabela de produção, mínimo alvo máximo", true);

  doc.setFontSize(8);
  doc.setTextColor(120);
  y = quebra(doc, y, 10);
  doc.text(
    limparTexto("Devido ao processo de confecção, os tamanhos podem variar dentro da faixa indicada."),
    MARGEM,
    y,
  );
  doc.setTextColor(0);

  rodape(doc);
  return doc.output("blob");
}

export function pdfEstampa(cores: CorEstampa[]): Blob {
  const doc = novoDoc(
    "Tabela de cores de estampa",
    "O CMYK é o dado real. O hexadecimal serve apenas para ver na tela.",
  );
  let y = 38;

  for (const familia of FAMILIAS) {
    const lista = cores.filter((c) => c.familia === familia && c.ativo);
    if (!lista.length) continue;

    const porLinha = POR_LINHA[familia as Familia];
    const largura = (LARGURA - MARGEM * 2 - (porLinha - 1) * 1) / porLinha;
    const altura = largura / 1.55;

    y = quebra(doc, y, 14 + altura);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(limparTexto(ROTULO_FAMILIA[familia as Familia]), MARGEM, y);
    y += 6;

    for (const linha of emLinhas(lista, porLinha)) {
      y = quebra(doc, y, altura + 2);
      linha.forEach((cor, i) => {
        const x = MARGEM + i * (largura + 1);
        doc.setFillColor(cor.hex);
        doc.rect(x, y, largura, altura, "F");

        const [r, g, b] = textoSobre(cor.hex);
        doc.setTextColor(r, g, b);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(porLinha > 12 ? 4.5 : 8);
        doc.text(limparTexto(cor.codigo), x + 1, y + altura / 2 - 0.3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(porLinha > 12 ? 3.2 : 6);
        doc.text(textoCmyk(cor), x + 1, y + altura / 2 + 3);
        doc.setTextColor(0);
      });
      y += altura + 1;
    }
    y += 7;
  }

  rodape(doc);
  return doc.output("blob");
}

// ---------------- O ZIP ----------------

export type ItemZip = { nomeArquivo: string; blob: Blob };

/**
 * Limpa o nome mas preserva a barra, porque ela é o que cria pasta
 * dentro do ZIP. Cada pedaço do caminho é limpo em separado.
 */
function nomeLimpo(s: string): string {
  return s
    .split("/")
    .map((parte) =>
      parte
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ._-]/g, "")
        .trim(),
    )
    .filter(Boolean)
    .join("/");
}

export async function baixarZip(nomeArquivo: string, itens: ItemZip[]): Promise<void> {
  const zip = new JSZip();
  for (const item of itens) {
    zip.file(nomeLimpo(item.nomeArquivo), item.blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeLimpo(nomeArquivo.endsWith(".zip") ? nomeArquivo : `${nomeArquivo}.zip`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------- Moodboard de referências visuais ----------------

/**
 * Duas colunas de altura livre, com encaixe automático.
 * A ordem da tela não é obrigatória aqui, quem decide é o encaixe,
 * então o vão que sobra no pé da folha é preenchido por quem couber nele.
 * Imagem bem deitada atravessa as duas colunas.
 */
export function pdfMoodboard(
  nomeGrupo: string,
  itens: { dataUrl: string; proporcao: number; span: number }[],
): Blob {
  const doc = novoDoc(`Moodboard ${nomeGrupo}`, `${itens.length} ${itens.length === 1 ? "referência" : "referências"}`);
  const VAO_PDF = 5;
  const TOPO_PRIMEIRA = 34;
  const TOPO_SEGUINTE = 25;
  const BASE = ALTURA - 20;
  const util = LARGURA - MARGEM * 2;
  const col = (util - VAO_PDF) / 2;

  const pendentes = itens
    .filter((i) => i.proporcao > 0 && i.dataUrl)
    .map((i) => ({ ...i, alt: (i.span === 2 ? util : col) / i.proporcao }));

  let topo = TOPO_PRIMEIRA;
  let y: [number, number] = [topo, topo];

  while (pendentes.length) {
    const iCol = y[0] <= y[1] ? 0 : 1;
    let escolhido = -1;
    let maior = -1;

    for (let k = 0; k < pendentes.length; k++) {
      const p = pendentes[k]!;
      const base = p.span === 2 ? Math.max(y[0], y[1]) : y[iCol];
      if (base + p.alt <= BASE && p.alt > maior) {
        maior = p.alt;
        escolhido = k;
      }
    }

    const folhaVazia = y[0] === topo && y[1] === topo;

    if (escolhido === -1) {
      if (folhaVazia) {
        // Peça mais alta que a folha inteira. Entra encolhida para não travar o laço.
        const p = pendentes.shift()!;
        const alturaMax = BASE - topo;
        const largura = p.span === 2 ? util : col;
        const alt = Math.min(p.alt, alturaMax);
        doc.addImage(p.dataUrl, "JPEG", MARGEM + (p.span === 2 ? 0 : iCol * (col + VAO_PDF)), topo, largura, alt);
        y = [topo + alt + VAO_PDF, topo + alt + VAO_PDF];
        continue;
      }
      doc.addPage();
      topo = TOPO_SEGUINTE;
      y = [topo, topo];
      continue;
    }

    const p = pendentes.splice(escolhido, 1)[0]!;
    if (p.span === 2) {
      const yy = Math.max(y[0], y[1]);
      doc.addImage(p.dataUrl, "JPEG", MARGEM, yy, util, p.alt);
      y = [yy + p.alt + VAO_PDF, yy + p.alt + VAO_PDF];
    } else {
      const x = MARGEM + iCol * (col + VAO_PDF);
      doc.addImage(p.dataUrl, "JPEG", x, y[iCol], col, p.alt);
      y[iCol] = y[iCol] + p.alt + VAO_PDF;
    }
  }

  rodape(doc);
  return doc.output("blob");
}
