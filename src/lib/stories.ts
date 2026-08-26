import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MAX_FRAMES = 5;
export const BUCKET = "stories";

/** Valor gravado no banco e rótulo mostrado na tela. */
export const RECURSOS = [
  { value: "Nenhum", label: "Nenhum" },
  { value: "Link", label: "Link" },
  { value: "Enquete", label: "Enquete" },
  { value: "Menção", label: "Menção" },
  { value: "Slider", label: "Slider de emoji" },
  { value: "Caixa de pergunta", label: "Caixa de pergunta" },
] as const;
export type Recurso = (typeof RECURSOS)[number]["value"];
export const RECURSO_VALUES = RECURSOS.map((r) => r.value) as readonly Recurso[];

export type StoryStatus = "pendente" | "aprovado" | "ajustar";

/** Status por arte. 'refeito' = imagem trocada, aguardando novo aval. */
export type FrameStatus = "pendente" | "ajustar" | "refeito" | "aprovado";

/** Composição visual desenhada sobre a arte (camada de texto e camada de logo). */
export type AlinhamentoTexto = "left" | "center" | "right";

export type Composicao = {
  texto_x: number;
  texto_y: number;
  texto_fonte: string;
  texto_peso: number;
  texto_tamanho: number;
  texto_cor: string;
  texto_alinhamento: AlinhamentoTexto;
  /** Largura da caixa de texto, em % da largura da arte. */
  texto_largura: number;
  sombra_cor: string;
  sombra_opacidade: number;
  logo_ativo: boolean;
  logo_id: string | null;
  logo_x: number;
  logo_y: number;
  logo_tamanho: number;
  logo_cor: string;
};

export const COMPOSICAO_PADRAO: Composicao = {
  texto_x: 50,
  texto_y: 50,
  texto_fonte: "Google Sans Flex",
  texto_peso: 400,
  texto_tamanho: 5,
  texto_cor: "#ffffff",
  texto_alinhamento: "left",
  texto_largura: 80,
  sombra_cor: "#000000",
  sombra_opacidade: 50,
  logo_ativo: false,
  logo_id: null,
  logo_x: 50,
  logo_y: 85,
  logo_tamanho: 4,
  logo_cor: "#ffffff",
};

/** Colunas da composição no banco (prefixo comp_). */
export const COLUNAS_COMPOSICAO = [
  "comp_texto_x",
  "comp_texto_y",
  "comp_texto_fonte",
  "comp_texto_peso",
  "comp_texto_tamanho",
  "comp_texto_cor",
  "comp_texto_alinhamento",
  "comp_texto_largura",
  "comp_sombra_cor",
  "comp_sombra_opacidade",
  "comp_logo_ativo",
  "comp_logo_id",
  "comp_logo_x",
  "comp_logo_y",
  "comp_logo_tamanho",
  "comp_logo_cor",
].join(", ");

/** Linha crua de story_frames, incluindo as colunas de composição. */
export type FrameRow = {
  id: unknown;
  story_id: unknown;
  image_path: unknown;
  ordem: unknown;
  nome_arquivo: unknown;
  texto_principal: unknown;
  observacao: unknown;
  recurso: unknown;
  recurso_detalhe: unknown;
  status: unknown;
  adjust_comment: unknown;
  adjust_comment_at: unknown;
  image_path_anterior: unknown;
  comp_texto_x?: unknown;
  comp_texto_y?: unknown;
  comp_texto_fonte?: unknown;
  comp_texto_peso?: unknown;
  comp_texto_tamanho?: unknown;
  comp_texto_cor?: unknown;
  comp_texto_alinhamento?: unknown;
  comp_texto_largura?: unknown;
  comp_sombra_cor?: unknown;
  comp_sombra_opacidade?: unknown;
  comp_logo_ativo?: unknown;
  comp_logo_id?: unknown;
  comp_logo_x?: unknown;
  comp_logo_y?: unknown;
  comp_logo_tamanho?: unknown;
  comp_logo_cor?: unknown;
};

export type Frame = {
  id: string;
  story_id: string;
  image_path: string;
  ordem: number;
  nome_arquivo: string;
  texto_principal: string;
  observacao: string;
  recurso: Recurso;
  /** Perfil da menção (@perfil). Só usado quando o recurso é Menção. */
  recurso_detalhe: string;
  url: string;
  status: FrameStatus;
  adjust_comment: string | null;
  adjust_comment_at: string | null;
  /** Guardado só por segurança no bucket. Nunca exibido na interface. */
  image_path_anterior: string | null;
  comp: Composicao;
};


export type Story = {
  id: string;
  position: number;
  status: StoryStatus;
  adjust_comment: string | null;
  adjust_comment_at: string | null;
  nome_bloco: string;
  sequence_id: string | null;
  descartado: boolean;
  /** Objetivo do story inteiro. Pode ficar vazio. */
  objective_id: string | null;
  frames: Frame[];
};

export type Sequence = {
  id: string;
  nome: string;
  arquivado: boolean;
  created_at: string;
};

/** Tipo do bloco é calculado: 1 frame = SOLO, 2 ou mais = CAMPANHA. */
export function blocoTipo(story: Story): "SOLO" | "CAMPANHA" {
  return story.frames.length > 1 ? "CAMPANHA" : "SOLO";
}

export function storiesQueryOptions(sequenceId: string | null) {
  return queryOptions({
    queryKey: ["stories", sequenceId],
    queryFn: () => fetchStories(sequenceId),
  });
}

export const sequencesQueryOptions = queryOptions({
  queryKey: ["story-sequences"],
  queryFn: fetchSequences,
});

export async function fetchSequences(): Promise<Sequence[]> {
  const { data, error } = await supabase
    .from("story_sequences")
    .select("id, nome, arquivado, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchStories(sequenceId: string | null): Promise<Story[]> {
  let query = supabase
    .from("stories")
    .select(
      "id, position, status, adjust_comment, adjust_comment_at, nome_bloco, sequence_id, descartado, objective_id",
    )
    .order("position", { ascending: true });
  query = sequenceId ? query.eq("sequence_id", sequenceId) : query.is("sequence_id", null);

  const { data: stories, error } = await query;
  if (error) throw error;

  const ids = (stories ?? []).map((s) => s.id);
  let frames: FrameRow[] = [];

  if (ids.length > 0) {
    const { data, error: framesError } = await supabase
      .from("story_frames")
      .select(
        `id, story_id, image_path, ordem, nome_arquivo, texto_principal, observacao, recurso, recurso_detalhe, status, adjust_comment, adjust_comment_at, image_path_anterior, ${COLUNAS_COMPOSICAO}`,
      )
      .in("story_id", ids)
      .order("ordem", { ascending: true });
    if (framesError) throw framesError;
    frames = (data ?? []) as unknown as FrameRow[];
  }


  const urls = new Map<string, string>();
  const paths = frames.map((f) => String(f.image_path));
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }

  return (stories ?? []).map((s) => ({
    id: s.id,
    position: s.position,
    status: s.status as StoryStatus,
    adjust_comment: s.adjust_comment,
    adjust_comment_at: s.adjust_comment_at,
    nome_bloco: s.nome_bloco ?? "",
    sequence_id: s.sequence_id ?? null,
    descartado: s.descartado ?? false,
    objective_id: s.objective_id ?? null,

    frames: frames
      .filter((f) => f.story_id === s.id)
      .map((f) => ({
        id: String(f.id),
        story_id: String(f.story_id),
        image_path: String(f.image_path),
        ordem: Number(f.ordem ?? 0),
        nome_arquivo: (f.nome_arquivo as string) ?? "",
        texto_principal: (f.texto_principal as string) ?? "",
        observacao: (f.observacao as string) ?? "",
        recurso: ((f.recurso as string) ?? "Nenhum") as Recurso,
        recurso_detalhe: (f.recurso_detalhe as string) ?? "",
        url: urls.get(String(f.image_path)) ?? "",
        status: ((f.status as string) ?? "pendente") as FrameStatus,
        adjust_comment: (f.adjust_comment as string | null) ?? null,
        adjust_comment_at: (f.adjust_comment_at as string | null) ?? null,
        image_path_anterior: (f.image_path_anterior as string | null) ?? null,
        comp: composicaoDaLinha(f),
      })),
  }));

}

/** Nome do arquivo sem extensão, aparado em 60 caracteres. */
export function nomeDoArquivo(file: File): string {
  return file.name
    .replace(/\.[^.]+$/, "")
    .trim()
    .slice(0, 60);
}

/** Comparação natural: números como números, sem diferenciar maiúsculas/acentos. */
export function compararNatural(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

/** Ordena arquivos pela ordem natural do nome (Prancheta 2 antes de Prancheta 10). */
export function ordenarArquivos(files: File[]): File[] {
  return [...files].sort((a, b) => compararNatural(a.name, b.name));
}

const EXTENSOES_IMAGEM = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "heic", "heif"];

function extensaoArquivo(file: File): string {
  const doNome = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (doNome && EXTENSOES_IMAGEM.includes(doNome)) return doNome;
  const doTipo = file.type.split("/").pop()?.toLowerCase() ?? "";
  if (doTipo === "jpeg") return "jpg";
  if (doTipo && EXTENSOES_IMAGEM.includes(doTipo)) return doTipo;
  return "";
}

/** Valida se o arquivo é uma imagem aceita. */
export function ehImagemAceita(file: File): boolean {
  return file.type.startsWith("image/") && extensaoArquivo(file) !== "";
}

async function uploadImage(file: File): Promise<string> {
  if (!ehImagemAceita(file)) {
    throw new Error(
      `"${file.name}" não é uma imagem aceita. Envie arquivos jpg, jpeg, png ou webp.`,
    );
  }
  const ext = extensaoArquivo(file);
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || `image/${ext}` });
  if (error) throw error;
  return path;
}

async function nextPosition(sequenceId: string | null): Promise<number> {
  let query = supabase.from("stories").select("position").order("position", { ascending: false });
  query = sequenceId ? query.eq("sequence_id", sequenceId) : query.is("sequence_id", null);
  const { data } = await query.limit(1);
  return (data?.[0]?.position ?? 0) + 1;
}

/** Cada imagem enviada cria um story novo com um frame. */
export async function createStoriesFromFiles(
  files: File[],
  sequenceId: string | null,
): Promise<void> {
  let position = await nextPosition(sequenceId);
  for (const file of ordenarArquivos(files)) {
    const nome = nomeDoArquivo(file);
    const path = await uploadImage(file);
    const { data: story, error } = await supabase
      .from("stories")
      .insert({ position, status: "pendente", sequence_id: sequenceId })
      .select("id")
      .single();
    if (error) throw error;
    const { error: frameError } = await supabase
      .from("story_frames")
      .insert({ story_id: story.id, image_path: path, ordem: 0, nome_arquivo: nome });
    if (frameError) throw frameError;
    position += 1;
  }
}

export async function addFramesToStory(
  storyId: string,
  files: File[],
  currentCount: number,
): Promise<void> {
  let ordem = currentCount;
  for (const file of ordenarArquivos(files)) {
    if (ordem >= MAX_FRAMES) throw new Error(`Cada story aceita no máximo ${MAX_FRAMES} frames`);
    const nome = nomeDoArquivo(file);
    const path = await uploadImage(file);
    const { error } = await supabase
      .from("story_frames")
      .insert({ story_id: storyId, image_path: path, ordem, nome_arquivo: nome });
    if (error) throw error;
    ordem += 1;
  }
}

/** Aprova uma arte. O status do bloco é recalculado pelo gatilho do banco. */
export async function approveFrame(frameId: string): Promise<void> {
  const { error } = await supabase
    .from("story_frames")
    .update({ status: "aprovado" })
    .eq("id", frameId);
  if (error) throw error;
}

/**
 * Aprova o bloco inteiro em cascata: todas as artes viram aprovado, inclusive as
 * que estavam em ajuste (o pedido de ajuste é descartado) ou refeito.
 */
export async function approveStory(story: Story): Promise<void> {
  const ids = story.frames.map((f) => f.id);
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("story_frames")
    .update({ status: "aprovado", adjust_comment: null, adjust_comment_at: null })
    .in("id", ids);
  if (error) throw error;
}

/** Pede ajuste em uma arte, guardando o comentário e a data na própria arte. */
export async function requestFrameAdjust(frameId: string, comment: string): Promise<void> {
  const { error } = await supabase
    .from("story_frames")
    .update({
      status: "ajustar",
      adjust_comment: comment,
      adjust_comment_at: new Date().toISOString(),
    })
    .eq("id", frameId);
  if (error) throw error;
}

/**
 * Troca a imagem de uma arte. O status volta obrigatoriamente para refeito,
 * mesmo se a arte já estava aprovada. Nome, ordem, textos, recurso, posição e
 * comentário de ajuste ficam como estavam. A imagem antiga fica parada no
 * bucket, sem link e sem aparecer na interface.
 */
export async function replaceFrameImage(frame: Frame, file: File): Promise<void> {
  const path = await uploadImage(file);
  const { error } = await supabase
    .from("story_frames")
    .update({
      image_path: path,
      image_path_anterior: frame.image_path,
      trocado_em: new Date().toISOString(),
      status: "refeito",
    })
    .eq("id", frame.id);
  if (error) throw error;
}

export async function updateStoryBloco(storyId: string, nomeBloco: string): Promise<void> {
  const { error } = await supabase
    .from("stories")
    .update({ nome_bloco: nomeBloco })
    .eq("id", storyId);
  if (error) throw error;
}

/** Define (ou limpa) o objetivo do story inteiro. */
export async function setStoryObjective(
  storyId: string,
  objectiveId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("stories")
    .update({ objective_id: objectiveId })
    .eq("id", storyId);
  if (error) throw error;
}

export async function updateFrameTexts(
  frameId: string,
  values: {
    texto_principal?: string;
    observacao?: string;
    recurso?: Recurso;
    recurso_detalhe?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("story_frames").update(values).eq("id", frameId);
  if (error) throw error;
}

/** Lê a composição de uma linha do banco, caindo no padrão quando vazia. */
export function composicaoDaLinha(f: FrameRow): Composicao {
  const num = (v: unknown, padrao: number) => (v === null || v === undefined ? padrao : Number(v));
  return {
    texto_x: num(f.comp_texto_x, COMPOSICAO_PADRAO.texto_x),
    texto_y: num(f.comp_texto_y, COMPOSICAO_PADRAO.texto_y),
    texto_fonte: (f.comp_texto_fonte as string) ?? COMPOSICAO_PADRAO.texto_fonte,
    texto_peso: num(f.comp_texto_peso, COMPOSICAO_PADRAO.texto_peso),
    texto_tamanho: num(f.comp_texto_tamanho, COMPOSICAO_PADRAO.texto_tamanho),
    texto_cor: (f.comp_texto_cor as string) ?? COMPOSICAO_PADRAO.texto_cor,
    texto_alinhamento: ((["left", "center", "right"] as const).includes(
      f.comp_texto_alinhamento as AlinhamentoTexto,
    )
      ? (f.comp_texto_alinhamento as AlinhamentoTexto)
      : COMPOSICAO_PADRAO.texto_alinhamento),
    texto_largura: num(f.comp_texto_largura, COMPOSICAO_PADRAO.texto_largura),
    sombra_cor: (f.comp_sombra_cor as string) ?? COMPOSICAO_PADRAO.sombra_cor,
    sombra_opacidade: num(f.comp_sombra_opacidade, COMPOSICAO_PADRAO.sombra_opacidade),
    logo_ativo: Boolean(f.comp_logo_ativo ?? COMPOSICAO_PADRAO.logo_ativo),
    logo_id: (f.comp_logo_id as string | null) ?? null,
    logo_x: num(f.comp_logo_x, COMPOSICAO_PADRAO.logo_x),
    logo_y: num(f.comp_logo_y, COMPOSICAO_PADRAO.logo_y),
    logo_tamanho: num(f.comp_logo_tamanho, COMPOSICAO_PADRAO.logo_tamanho),
    logo_cor: (f.comp_logo_cor as string) ?? COMPOSICAO_PADRAO.logo_cor,
  };
}

/** Salva só os campos alterados da composição, na arte informada. */
export async function updateFrameComposicao(
  frameId: string,
  patch: Partial<Composicao>,
): Promise<void> {
  const values: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(patch)) values[`comp_${chave}`] = valor;
  if (Object.keys(values).length === 0) return;
  const { error } = await supabase
    .from("story_frames")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(values as any)
    .eq("id", frameId);

  if (error) throw error;
}



async function removeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function deleteStory(story: Story): Promise<void> {
  const { error } = await supabase.from("stories").delete().eq("id", story.id);
  if (error) throw error;
  await removeImages([
    ...story.frames.map((f) => f.image_path),
    ...story.frames.map((f) => f.image_path_anterior).filter((p): p is string => Boolean(p)),
  ]);
}

/** Aprova todas as artes em pendente e refeito. Artes em ajustar não são tocadas. */
export async function approveAllPending(stories: Story[]): Promise<void> {
  const ids = stories
    .flatMap((s) => s.frames)
    .filter((f) => f.status === "pendente" || f.status === "refeito")
    .map((f) => f.id);
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("story_frames")
    .update({ status: "aprovado" })
    .in("id", ids);
  if (error) throw error;
}

/* ---------------- sequências ---------------- */

export async function createSequence(nome: string): Promise<Sequence> {
  const { data, error } = await supabase
    .from("story_sequences")
    .insert({ nome })
    .select("id, nome, arquivado, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function renameSequence(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from("story_sequences").update({ nome }).eq("id", id);
  if (error) throw error;
}

export async function setSequenceArquivado(id: string, arquivado: boolean): Promise<void> {
  const { error } = await supabase.from("story_sequences").update({ arquivado }).eq("id", id);
  if (error) throw error;
}

/** Marca ou desmarca um story como arte nao utilizada. */
export async function setDescartado(storyId: string, descartado: boolean): Promise<void> {
  const { error } = await supabase.from("stories").update({ descartado }).eq("id", storyId);
  if (error) throw error;
}

/** Move os stories informados para a sequência e renumera de 1 em diante. */
export async function moveStoriesToSequence(
  storyIds: string[],
  sequenceId: string | null,
  startAt = 1,
): Promise<void> {
  let position = startAt;
  for (const id of storyIds) {
    const { error } = await supabase
      .from("stories")
      .update({ sequence_id: sequenceId, position })
      .eq("id", id);
    if (error) throw error;
    position += 1;
  }
}

/** Cria a sequência e move para ela os stories informados. */
export async function saveAsSequence(nome: string, stories: Story[]): Promise<Sequence> {
  const sequence = await createSequence(nome);
  await moveStoriesToSequence(
    stories.map((s) => s.id),
    sequence.id,
  );
  return sequence;
}

export async function deleteSequence(id: string): Promise<void> {
  const stories = await fetchStories(id);
  const { error } = await supabase.from("story_sequences").delete().eq("id", id);
  if (error) throw error;
  await removeImages(
    stories.flatMap((s) =>
      s.frames
        .flatMap((f) => [f.image_path, f.image_path_anterior])
        .filter((p): p is string => Boolean(p)),
    ),
  );
}

/* ---------------- arraste ---------------- */

/** Funde o story de origem no story de destino, juntando os frames. */
export async function mergeStories(source: Story, target: Story): Promise<void> {
  if (source.frames.length + target.frames.length > MAX_FRAMES) {
    throw new Error(`A fusão passaria do limite de ${MAX_FRAMES} frames`);
  }
  let ordem = target.frames.length;
  for (const frame of source.frames) {
    const { error } = await supabase
      .from("story_frames")
      .update({ story_id: target.id, ordem })
      .eq("id", frame.id);
    if (error) throw error;
    ordem += 1;
  }
  const { error } = await supabase.from("stories").delete().eq("id", source.id);
  if (error) throw error;
}

/** Desfaz uma fusão, recriando o story de origem com os frames que eram dele. */
export async function undoMerge(source: Story, target: Story): Promise<void> {
  const { data: recreated, error } = await supabase
    .from("stories")
    .insert({
      position: source.position,
      status: source.status,
      adjust_comment: source.adjust_comment,
      adjust_comment_at: source.adjust_comment_at,
      nome_bloco: source.nome_bloco,
      sequence_id: source.sequence_id,
      descartado: source.descartado,
      objective_id: source.objective_id,
    })
    .select("id")
    .single();
  if (error) throw error;

  let ordem = 0;
  for (const frame of source.frames) {
    const { error: moveError } = await supabase
      .from("story_frames")
      .update({ story_id: recreated.id, ordem })
      .eq("id", frame.id);
    if (moveError) throw moveError;
    ordem += 1;
  }

  let targetOrdem = 0;
  for (const frame of target.frames) {
    const { error: fixError } = await supabase
      .from("story_frames")
      .update({ ordem: targetOrdem })
      .eq("id", frame.id);
    if (fixError) throw fixError;
    targetOrdem += 1;
  }
}

export async function reorderFrames(frameIds: string[]): Promise<void> {
  for (const [i, id] of frameIds.entries()) {
    const { error } = await supabase.from("story_frames").update({ ordem: i }).eq("id", id);
    if (error) throw error;
  }
}

/** Grava a nova ordem dos cards dentro da sequência aberta. */
export async function reorderStories(storyIds: string[]): Promise<void> {
  for (const [i, id] of storyIds.entries()) {
    const { error } = await supabase
      .from("stories")
      .update({ position: i + 1 })
      .eq("id", id);
    if (error) throw error;
  }
}

/** Reordena a fila principal do projeto pela ordem natural do nome do primeiro frame. */
export async function sortStoriesByName(sequenceId: string | null): Promise<void> {
  const stories = (await fetchStories(sequenceId)).filter(
    (s) => !s.descartado && s.frames.length > 0,
  );
  const ordenados = [...stories].sort((a, b) =>
    compararNatural(a.frames[0]?.nome_arquivo ?? "", b.frames[0]?.nome_arquivo ?? ""),
  );
  await reorderStories(ordenados.map((s) => s.id));
}

export async function moveFrame(frameId: string, targetStory: Story, index: number): Promise<void> {
  if (targetStory.frames.length >= MAX_FRAMES) {
    throw new Error(`Cada story aceita no máximo ${MAX_FRAMES} frames`);
  }
  const { error } = await supabase
    .from("story_frames")
    .update({ story_id: targetStory.id, ordem: index })
    .eq("id", frameId);
  if (error) throw error;

  const ids = targetStory.frames.map((f) => f.id);
  ids.splice(index, 0, frameId);
  await reorderFrames(ids);
}

/** Separa um frame num story novo só com ele. */
export async function splitFrame(frameId: string, sequenceId: string | null): Promise<void> {
  const position = await nextPosition(sequenceId);
  const { data: story, error } = await supabase
    .from("stories")
    .insert({ position, status: "pendente", sequence_id: sequenceId })
    .select("id")
    .single();
  if (error) throw error;
  const { error: moveError } = await supabase
    .from("story_frames")
    .update({ story_id: story.id, ordem: 0 })
    .eq("id", frameId);
  if (moveError) throw moveError;
}

/** Remove stories sem frames e renumera a fila principal e a lista de nao utilizadas. */
export async function normalize(sequenceId: string | null): Promise<void> {
  const stories = await fetchStories(sequenceId);
  const empty = stories.filter((s) => s.frames.length === 0);
  if (empty.length > 0) {
    await supabase
      .from("stories")
      .delete()
      .in(
        "id",
        empty.map((s) => s.id),
      );
  }
  const remaining = stories.filter((s) => s.frames.length > 0);
  const grupos = [remaining.filter((s) => !s.descartado), remaining.filter((s) => s.descartado)];
  for (const grupo of grupos) {
    for (const [i, story] of grupo.entries()) {
      if (story.position !== i + 1) {
        await supabase
          .from("stories")
          .update({ position: i + 1 })
          .eq("id", story.id);
      }
      for (const [j, frame] of story.frames.entries()) {
        if (frame.ordem !== j) {
          await supabase.from("story_frames").update({ ordem: j }).eq("id", frame.id);
        }
      }
    }
  }
}
