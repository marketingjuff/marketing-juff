import { RECURSOS, type Recurso, type Story } from "@/lib/stories";
import { supabase } from "@/integrations/supabase/client";

export type PlanArte = {
  nome_arquivo: string;
  texto_principal: string;
  observacao: string;
  recurso: Recurso;
};

export type PlanBloco = {
  numero: number;
  tipo: "SOLO" | "CAMPANHA";
  nome: string;
  artes: PlanArte[];
};

export type PlanValidation = {
  blocos: PlanBloco[];
  faltando: string[];
  repetidos: string[];
  desconhecidos: string[];
  recursosInvalidos: string[];
  ok: boolean;
};

function normalizaNome(value: string): string {
  return value.trim().toLowerCase();
}

/** Lê apenas as linhas que começam com BLOCO ou ARTE e ignora o resto. */
export function parsePlan(text: string): PlanBloco[] {
  const blocos: PlanBloco[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const partes = line.split("|").map((p) => p.trim());
    const head = (partes[0] ?? "").toUpperCase();

    if (head === "BLOCO") {
      const numero = Number.parseInt(partes[1] ?? "", 10);
      const tipo = (partes[2] ?? "").toUpperCase() === "CAMPANHA" ? "CAMPANHA" : "SOLO";
      blocos.push({
        numero: Number.isFinite(numero) ? numero : blocos.length + 1,
        tipo,
        nome: partes[3] ?? "",
        artes: [],
      });
      continue;
    }

    if (head === "ARTE") {
      const arte: PlanArte = {
        nome_arquivo: partes[1] ?? "",
        texto_principal: partes[2] ?? "",
        observacao: partes[3] ?? "",
        recurso: (partes[4] ?? "Nenhum") as Recurso,
      };
      if (!arte.nome_arquivo) continue;
      if (blocos.length === 0) {
        blocos.push({ numero: 1, tipo: "SOLO", nome: "", artes: [] });
      }
      blocos[blocos.length - 1]!.artes.push(arte);
    }
  }
  return blocos.filter((b) => b.artes.length > 0);
}

export function validatePlan(blocos: PlanBloco[], stories: Story[]): PlanValidation {
  const frames = stories.flatMap((s) => s.frames);
  const disponiveis = new Map<string, number>();
  for (const f of frames) {
    const key = normalizaNome(f.nome_arquivo);
    disponiveis.set(key, (disponiveis.get(key) ?? 0) + 1);
  }

  const usados = new Map<string, number>();
  const desconhecidos: string[] = [];
  const recursosInvalidos: string[] = [];

  for (const bloco of blocos) {
    for (const arte of bloco.artes) {
      const key = normalizaNome(arte.nome_arquivo);
      usados.set(key, (usados.get(key) ?? 0) + 1);
      if (!disponiveis.has(key)) desconhecidos.push(arte.nome_arquivo);
      if (!RECURSOS.includes(arte.recurso)) {
        recursosInvalidos.push(`${arte.nome_arquivo}: ${arte.recurso}`);
      }
    }
  }

  const faltando = frames
    .filter((f) => (usados.get(normalizaNome(f.nome_arquivo)) ?? 0) === 0)
    .map((f) => f.nome_arquivo || "(sem nome)");

  const repetidos = [...usados.entries()]
    .filter(([key, count]) => count > 1 && disponiveis.has(key))
    .map(([key]) => key);

  return {
    blocos,
    faltando,
    repetidos,
    desconhecidos,
    recursosInvalidos,
    ok:
      blocos.length > 0 &&
      faltando.length === 0 &&
      repetidos.length === 0 &&
      desconhecidos.length === 0 &&
      recursosInvalidos.length === 0,
  };
}

/**
 * Refaz os agrupamentos conforme os blocos, grava os textos e renumera a fila.
 * Nenhuma imagem é apagada nem enviada de novo.
 */
export async function applyPlan(
  blocos: PlanBloco[],
  stories: Story[],
  sequenceId: string | null,
): Promise<void> {
  const frameByNome = new Map<string, Story["frames"][number]>();
  for (const story of stories) {
    for (const frame of story.frames) {
      frameByNome.set(normalizaNome(frame.nome_arquivo), frame);
    }
  }

  const usados = new Set<string>();

  for (const [index, bloco] of blocos.entries()) {
    const frames = bloco.artes
      .map((a) => frameByNome.get(normalizaNome(a.nome_arquivo)))
      .filter((f): f is Story["frames"][number] => Boolean(f));
    if (frames.length === 0) continue;

    // Reaproveita o story dono do primeiro frame, para preservar status e histórico.
    let storyId = frames[0]!.story_id;
    if (usados.has(storyId)) {
      const { data, error } = await supabase
        .from("stories")
        .insert({ position: index + 1, status: "pendente", sequence_id: sequenceId })
        .select("id")
        .single();
      if (error) throw error;
      storyId = data.id;
    }
    usados.add(storyId);

    const { error: storyError } = await supabase
      .from("stories")
      .update({ nome_bloco: bloco.nome, position: index + 1, sequence_id: sequenceId })
      .eq("id", storyId);
    if (storyError) throw storyError;

    for (const [ordem, frame] of frames.entries()) {
      const arte = bloco.artes[ordem]!;
      const { error } = await supabase
        .from("story_frames")
        .update({
          story_id: storyId,
          ordem,
          texto_principal: arte.texto_principal,
          observacao: arte.observacao,
          recurso: arte.recurso,
        })
        .eq("id", frame.id);
      if (error) throw error;
    }
  }

  // Stories que ficaram sem frames são removidos.
  const vazios = stories.filter((s) => !usados.has(s.id)).map((s) => s.id);
  if (vazios.length > 0) {
    const { error } = await supabase.from("stories").delete().in("id", vazios);
    if (error) throw error;
  }
}

/** Extrai texto puro de um .docx. */
export async function readDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
