import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MAX_FRAMES = 5;
export const BUCKET = "stories";

export const RECURSOS = [
  "Nenhum",
  "Link",
  "Enquete",
  "Menção",
  "Slider",
  "Caixa de pergunta",
] as const;
export type Recurso = (typeof RECURSOS)[number];

export type StoryStatus = "pendente" | "aprovado" | "ajustar";

export type Frame = {
  id: string;
  story_id: string;
  image_path: string;
  ordem: number;
  nome_arquivo: string;
  texto_principal: string;
  observacao: string;
  recurso: Recurso;
  url: string;
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
    .select("id, position, status, adjust_comment, adjust_comment_at, nome_bloco, sequence_id, descartado")
    .order("position", { ascending: true });
  query = sequenceId ? query.eq("sequence_id", sequenceId) : query.is("sequence_id", null);

  const { data: stories, error } = await query;
  if (error) throw error;

  const ids = (stories ?? []).map((s) => s.id);
  let frames: {
    id: string;
    story_id: string;
    image_path: string;
    ordem: number;
    nome_arquivo: string;
    texto_principal: string;
    observacao: string;
    recurso: string;
  }[] = [];

  if (ids.length > 0) {
    const { data, error: framesError } = await supabase
      .from("story_frames")
      .select("id, story_id, image_path, ordem, nome_arquivo, texto_principal, observacao, recurso")
      .in("story_id", ids)
      .order("ordem", { ascending: true });
    if (framesError) throw framesError;
    frames = data ?? [];
  }

  const urls = new Map<string, string>();
  const paths = frames.map((f) => f.image_path);
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
    frames: frames
      .filter((f) => f.story_id === s.id)
      .map((f) => ({
        id: f.id,
        story_id: f.story_id,
        image_path: f.image_path,
        ordem: f.ordem,
        nome_arquivo: f.nome_arquivo ?? "",
        texto_principal: f.texto_principal ?? "",
        observacao: f.observacao ?? "",
        recurso: (f.recurso ?? "Nenhum") as Recurso,
        url: urls.get(f.image_path) ?? "",
      })),
  }));
}

/** Nome do arquivo sem extensão, aparado em 60 caracteres. */
export function nomeDoArquivo(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim().slice(0, 60);
}

/** Comprime a imagem no navegador: ~900px de largura, jpeg qualidade 0.7. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const targetWidth = Math.min(900, bitmap.width);
  const scale = targetWidth / bitmap.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.7),
  );
  if (!blob) throw new Error("Não foi possível comprimir a imagem");
  return blob;
}

async function uploadImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });
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
  for (const file of files) {
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
  for (const file of files) {
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

export async function setStatus(storyId: string, status: StoryStatus): Promise<void> {
  const { error } = await supabase
    .from("stories")
    .update({
      status,
      ...(status === "aprovado" ? { adjust_comment: null, adjust_comment_at: null } : {}),
    })
    .eq("id", storyId);
  if (error) throw error;
}

export async function requestAdjust(storyId: string, comment: string): Promise<void> {
  const { error } = await supabase
    .from("stories")
    .update({
      status: "ajustar",
      adjust_comment: comment,
      adjust_comment_at: new Date().toISOString(),
    })
    .eq("id", storyId);
  if (error) throw error;
}

export async function updateStoryBloco(storyId: string, nomeBloco: string): Promise<void> {
  const { error } = await supabase
    .from("stories")
    .update({ nome_bloco: nomeBloco })
    .eq("id", storyId);
  if (error) throw error;
}

export async function updateFrameTexts(
  frameId: string,
  values: { texto_principal?: string; observacao?: string; recurso?: Recurso },
): Promise<void> {
  const { error } = await supabase.from("story_frames").update(values).eq("id", frameId);
  if (error) throw error;
}

async function removeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function deleteStory(story: Story): Promise<void> {
  const { error } = await supabase.from("stories").delete().eq("id", story.id);
  if (error) throw error;
  await removeImages(story.frames.map((f) => f.image_path));
}

export async function approveAllPending(stories: Story[]): Promise<void> {
  const ids = stories.filter((s) => s.status === "pendente").map((s) => s.id);
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("stories")
    .update({ status: "aprovado", adjust_comment: null, adjust_comment_at: null })
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
  await removeImages(stories.flatMap((s) => s.frames.map((f) => f.image_path)));
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

export async function moveFrame(
  frameId: string,
  targetStory: Story,
  index: number,
): Promise<void> {
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
  const grupos = [
    remaining.filter((s) => !s.descartado),
    remaining.filter((s) => s.descartado),
  ];
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
