import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MAX_FRAMES = 5;
export const BUCKET = "stories";

export type StoryStatus = "pendente" | "aprovado" | "ajustar";

export type Frame = {
  id: string;
  story_id: string;
  image_path: string;
  ordem: number;
  url: string;
};

export type Story = {
  id: string;
  position: number;
  status: StoryStatus;
  adjust_comment: string | null;
  adjust_comment_at: string | null;
  frames: Frame[];
};

export const storiesQueryOptions = queryOptions({
  queryKey: ["stories"],
  queryFn: fetchStories,
});

export async function fetchStories(): Promise<Story[]> {
  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, position, status, adjust_comment, adjust_comment_at")
    .order("position", { ascending: true });
  if (error) throw error;

  const { data: frames, error: framesError } = await supabase
    .from("story_frames")
    .select("id, story_id, image_path, ordem")
    .order("ordem", { ascending: true });
  if (framesError) throw framesError;

  const urls = new Map<string, string>();
  const paths = (frames ?? []).map((f) => f.image_path);
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
    frames: (frames ?? [])
      .filter((f) => f.story_id === s.id)
      .map((f) => ({
        id: f.id,
        story_id: f.story_id,
        image_path: f.image_path,
        ordem: f.ordem,
        url: urls.get(f.image_path) ?? "",
      })),
  }));
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

async function nextPosition(): Promise<number> {
  const { data } = await supabase
    .from("stories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? 0) + 1;
}

/** Cada imagem enviada cria um story novo com um frame. */
export async function createStoriesFromFiles(files: File[]): Promise<void> {
  let position = await nextPosition();
  for (const file of files) {
    const path = await uploadImage(file);
    const { data: story, error } = await supabase
      .from("stories")
      .insert({ position, status: "pendente" })
      .select("id")
      .single();
    if (error) throw error;
    const { error: frameError } = await supabase
      .from("story_frames")
      .insert({ story_id: story.id, image_path: path, ordem: 0 });
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
    const path = await uploadImage(file);
    const { error } = await supabase
      .from("story_frames")
      .insert({ story_id: storyId, image_path: path, ordem });
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

export async function clearApproved(stories: Story[]): Promise<void> {
  const approved = stories.filter((s) => s.status === "aprovado");
  if (approved.length === 0) return;
  const { error } = await supabase
    .from("stories")
    .delete()
    .in(
      "id",
      approved.map((s) => s.id),
    );
  if (error) throw error;
  await removeImages(approved.flatMap((s) => s.frames.map((f) => f.image_path)));
}

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
export async function splitFrame(frameId: string): Promise<void> {
  const position = await nextPosition();
  const { data: story, error } = await supabase
    .from("stories")
    .insert({ position, status: "pendente" })
    .select("id")
    .single();
  if (error) throw error;
  const { error: moveError } = await supabase
    .from("story_frames")
    .update({ story_id: story.id, ordem: 0 })
    .eq("id", frameId);
  if (moveError) throw moveError;
}

/** Remove stories sem frames e renumera a fila em sequência. */
export async function normalize(): Promise<void> {
  const stories = await fetchStories();
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
  for (const [i, story] of remaining.entries()) {
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
