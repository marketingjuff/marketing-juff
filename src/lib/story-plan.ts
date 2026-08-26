import { MAX_FRAMES, RECURSOS, type Recurso, type Story } from "@/lib/stories";
import type { Objective } from "@/lib/objectives";
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
  /** Texto do objetivo como veio no arquivo. Pode ser vazio. */
  objetivo: string;
  /** Id do objetivo cadastrado, quando o nome bate. */
  objective_id: string | null;
  artes: PlanArte[];
};

export type PlanSobra = {
  nome_arquivo: string;
  motivo: string;
};

export type PlanValidation = {
  blocos: PlanBloco[];
  sobras: PlanSobra[];
  faltando: string[];
  repetidos: string[];
  desconhecidos: string[];
  recursosInvalidos: string[];
  blocosCheios: string[];
  /** Objetivos citados no arquivo que não existem no cadastro. Não bloqueia. */
  objetivosDesconhecidos: string[];
  ok: boolean;
};

function normalizaNome(value: string): string {
  return value.trim().toLowerCase();
}

/** Compara ignorando maiúsculas, minúsculas e acentos. */
function chaveObjetivo(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}


/** Lê apenas as linhas que começam com BLOCO, ARTE ou SOBRA e ignora o resto. */
export function parsePlan(text: string): { blocos: PlanBloco[]; sobras: PlanSobra[] } {
  const blocos: PlanBloco[] = [];
  const sobras: PlanSobra[] = [];

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
        objetivo: partes[4] ?? "",
        objective_id: null,
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
        blocos.push({ numero: 1, tipo: "SOLO", nome: "", objetivo: "", objective_id: null, artes: [] });
      }
      blocos[blocos.length - 1]!.artes.push(arte);
      continue;
    }

    if (head === "SOBRA") {
      const nome = partes[1] ?? "";
      if (!nome) continue;
      sobras.push({ nome_arquivo: nome, motivo: partes[2] ?? "" });
    }
  }

  return { blocos: blocos.filter((b) => b.artes.length > 0), sobras };
}

export function validatePlan(
  parsed: { blocos: PlanBloco[]; sobras: PlanSobra[] },
  stories: Story[],
  objetivos: Objective[] = [],
): PlanValidation {
  const porNome = new Map(objetivos.map((o) => [chaveObjetivo(o.nome), o.id]));
  const objetivosDesconhecidos: string[] = [];
  for (const bloco of parsed.blocos) {
    const texto = bloco.objetivo.trim();
    if (!texto) {
      bloco.objective_id = null;
      continue;
    }
    const id = porNome.get(chaveObjetivo(texto)) ?? null;
    bloco.objective_id = id;
    if (!id && !objetivosDesconhecidos.includes(texto)) objetivosDesconhecidos.push(texto);
  }

  const { blocos, sobras } = parsed;
  const frames = stories.flatMap((s) => s.frames);
  const disponiveis = new Map<string, number>();
  for (const f of frames) {
    const key = normalizaNome(f.nome_arquivo);
    disponiveis.set(key, (disponiveis.get(key) ?? 0) + 1);
  }

  const usados = new Map<string, number>();
  const desconhecidos: string[] = [];
  const recursosInvalidos: string[] = [];
  const blocosCheios: string[] = [];

  const conta = (nome: string) => {
    const key = normalizaNome(nome);
    usados.set(key, (usados.get(key) ?? 0) + 1);
    if (!disponiveis.has(key)) desconhecidos.push(nome);
  };

  for (const bloco of blocos) {
    if (bloco.artes.length > MAX_FRAMES) {
      blocosCheios.push(`${bloco.nome || `Bloco ${bloco.numero}`} (${bloco.artes.length} artes)`);
    }
    for (const arte of bloco.artes) {
      conta(arte.nome_arquivo);
      if (!RECURSOS.includes(arte.recurso)) {
        recursosInvalidos.push(`${arte.nome_arquivo}: ${arte.recurso}`);
      }
    }
  }

  for (const sobra of sobras) conta(sobra.nome_arquivo);

  const faltando = frames
    .filter((f) => (usados.get(normalizaNome(f.nome_arquivo)) ?? 0) === 0)
    .map((f) => f.nome_arquivo || "(sem nome)");

  const repetidos = [...usados.entries()]
    .filter(([key, count]) => count > 1 && disponiveis.has(key))
    .map(([key]) => key);

  return {
    blocos,
    sobras,
    faltando,
    repetidos,
    desconhecidos,
    recursosInvalidos,
    blocosCheios,
    objetivosDesconhecidos,
    ok:
      blocos.length > 0 &&

      faltando.length === 0 &&
      repetidos.length === 0 &&
      desconhecidos.length === 0 &&
      recursosInvalidos.length === 0 &&
      blocosCheios.length === 0,
  };
}

/**
 * Refaz os agrupamentos conforme os blocos, grava os textos, renumera a fila e
 * marca as sobras como artes não utilizadas. Nenhuma imagem é apagada nem reenviada.
 */
export async function applyPlan(
  validation: PlanValidation,
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

  async function novoStory(position: number, descartado: boolean): Promise<string> {
    const { data, error } = await supabase
      .from("stories")
      .insert({ position, status: "pendente", sequence_id: sequenceId, descartado })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  for (const [index, bloco] of validation.blocos.entries()) {
    const frames = bloco.artes
      .map((a) => frameByNome.get(normalizaNome(a.nome_arquivo)))
      .filter((f): f is Story["frames"][number] => Boolean(f));
    if (frames.length === 0) continue;

    // Reaproveita o story dono do primeiro frame, para preservar status e histórico.
    let storyId = frames[0]!.story_id;
    if (usados.has(storyId)) storyId = await novoStory(index + 1, false);
    usados.add(storyId);

    const { error: storyError } = await supabase
      .from("stories")
      .update({
        nome_bloco: bloco.nome,
        position: index + 1,
        sequence_id: sequenceId,
        descartado: false,
      })
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

  // Cada sobra vira um story individual marcado como não utilizada. Nada é apagado.
  let sobraPos = 1;
  for (const sobra of validation.sobras) {
    const frame = frameByNome.get(normalizaNome(sobra.nome_arquivo));
    if (!frame) continue;
    let storyId = frame.story_id;
    if (usados.has(storyId)) storyId = await novoStory(sobraPos, true);
    usados.add(storyId);

    const { error } = await supabase
      .from("stories")
      .update({ position: sobraPos, sequence_id: sequenceId, descartado: true, nome_bloco: "" })
      .eq("id", storyId);
    if (error) throw error;

    const { error: frameError } = await supabase
      .from("story_frames")
      .update({ story_id: storyId, ordem: 0 })
      .eq("id", frame.id);
    if (frameError) throw frameError;
    sobraPos += 1;
  }

  // Stories que ficaram sem nenhum frame deixam de existir (não há imagem envolvida).
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
