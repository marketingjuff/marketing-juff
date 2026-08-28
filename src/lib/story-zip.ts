import type { Objective } from "@/lib/objectives";
import type { Story } from "@/lib/stories";
import { EXPORT_EXTENSAO, montarArteExport } from "@/lib/story-editor";


/** Remove acentos, cedilha e caracteres fora de letra, número e hífen. */
function limpaNome(nome: string): string {
  const base = (nome ?? "").trim();
  if (!base) return "SEM-NOME";
  const semAcento = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const limpo = semAcento
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (limpo || "SEM-NOME").slice(0, 30).replace(/-$/, "") || "SEM-NOME";
}

function nomeZip(nomeProjeto: string): string {
  const base = (nomeProjeto || "stories")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "");
  return `${base || "stories"}.zip`;
}


export class ExportZipError extends Error {
  falhas: string[];
  constructor(falhas: string[]) {
    super("Falha ao baixar imagens");
    this.name = "ExportZipError";
    this.falhas = falhas;
  }
}

/** Gera e baixa o zip com as artes montadas (texto e logo) da fila principal. */
export async function exportStoriesZip(
  stories: Story[],
  nomeProjeto: string,
  objetivos: Objective[] = [],
  svgPorLogo: (logoId: string | null) => string | null = () => null,
): Promise<number> {
  const JSZip = (await import("jszip")).default;
  const fila = stories.filter((s) => !s.descartado);
  const total = fila.reduce((acc, s) => acc + s.frames.length, 0);
  if (total === 0) return 0;

  const digitos = total > 99 ? 3 : 2;
  const usados = new Map<string, number>();
  const falhas: string[] = [];

  type Item = { arquivo: string; blob: Blob; story: Story; pos: number; totalBloco: number };
  const itens: Item[] = [];
  let ordem = 0;

  for (const story of fila) {
    const blocoNome = limpaNome(story.nome_bloco);
    for (let i = 0; i < story.frames.length; i += 1) {
      const frame = story.frames[i]!;
      ordem += 1;
      const prefixo = String(ordem).padStart(digitos, "0");
      const ext = EXPORT_EXTENSAO;
      let arquivo = `${prefixo}_${blocoNome}_${i + 1}de${story.frames.length}${ext}`;
      const vezes = usados.get(arquivo) ?? 0;
      usados.set(arquivo, vezes + 1);
      if (vezes > 0) arquivo = arquivo.replace(new RegExp(`${ext}$`), `-${vezes + 1}${ext}`);

      try {
        const blob = await montarArteExport(frame, svgPorLogo(frame.comp.logo_id));
        itens.push({ arquivo, blob, story, pos: i + 1, totalBloco: story.frames.length });
      } catch {
        falhas.push(`${story.nome_bloco || "Sem nome do bloco"} — arte ${i + 1} de ${story.frames.length}`);
      }
    }
  }


  if (falhas.length > 0) throw new ExportZipError(falhas);

  const zip = new JSZip();
  for (const item of itens) zip.file(item.arquivo, item.blob);

  const linhas: string[] = [
    nomeProjeto,
    `Exportado em ${new Date().toLocaleString("pt-BR")}`,
    `Total de artes: ${total}`,
    "",
  ];
  let blocoAnterior: string | null = null;
  for (const item of itens) {
    if (blocoAnterior !== null && blocoAnterior !== item.story.id) {
      linhas.push("------------------------------------------------------------", "");
    }
    blocoAnterior = item.story.id;
    const frame = item.story.frames[item.pos - 1]!;
    const objetivo = objetivos.find((o) => o.id === item.story.objective_id);
    linhas.push(`Arquivo: ${item.arquivo}`);
    linhas.push(`Bloco: ${item.story.nome_bloco || "Sem nome do bloco"}`);
    if (objetivo) linhas.push(`Objetivo: ${objetivo.nome}`);
    linhas.push(`Texto da arte: ${frame.texto_principal || "—"}`);
    linhas.push(`Observação: ${frame.observacao || "—"}`);
    linhas.push(`CTA: ${frame.cta || "—"}`);
    linhas.push(`Link: ${frame.cta_link || "—"}`);
    linhas.push("");
  }
  zip.file("roteiro.txt", linhas.join("\n"));

  // Imagem JPEG já vem comprimida. Guardar sem recomprimir deixa o zip muito mais rápido.
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeZip(nomeProjeto);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return total;
}
