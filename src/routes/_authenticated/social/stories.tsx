import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Trash2, CheckCheck, Layers } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StoryCard } from "@/components/stories/StoryCard";
import { UploadArea } from "@/components/stories/UploadArea";
import { canEdit, profileQueryOptions, hasPermission } from "@/lib/auth";
import {
  MAX_FRAMES,
  addFramesToStory,
  approveAllPending,
  clearApproved,
  createStoriesFromFiles,
  deleteStory,
  mergeStories,
  moveFrame,
  normalize,
  reorderFrames,
  requestAdjust,
  setStatus,
  splitFrame,
  storiesQueryOptions,
  undoMerge,
  type Story,
  type StoryStatus,
} from "@/lib/stories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/social/stories")({
  head: () => ({
    meta: [
      { title: "Stories — Marketing Juff" },
      {
        name: "description",
        content:
          "Painel de aprovação de stories da Juff: envie imagens, organize frames e aprove publicações.",
      },
      { property: "og:title", content: "Stories — Marketing Juff" },
      {
        property: "og:description",
        content: "Painel de aprovação de stories da Juff com upload, organização e aprovação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StoriesPage,
});

type Filtro = "todos" | StoryStatus;

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendente", label: "Pendentes" },
  { key: "aprovado", label: "Aprovados" },
  { key: "ajustar", label: "Ajustar" },
];

function NewStoryZone({ visible }: { visible: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "new-story", data: { type: "new-story" } });
  if (!visible) return null;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid min-h-[7rem] place-items-center rounded-xl border-2 border-dashed border-primary/50 bg-primary-soft/50 text-sm text-primary",
        isOver && "border-primary bg-primary-soft",
      )}
    >
      <span className="flex items-center gap-2">
        <Layers className="size-4" /> Solte aqui para criar um story novo
      </span>
    </div>
  );
}

function StoriesPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const { data: stories } = useSuspenseQuery(storiesQueryOptions);
  const queryClient = useQueryClient();

  const podeVer = hasPermission(profile, "social.stories");
  const editable = canEdit(profile, "social.stories");

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState<{ type: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["stories"] });

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => {
      await fn();
      await normalize();
    },
    onSuccess: refresh,
    onError: (error: Error) => {
      toast.error(error.message);
      refresh();
    },
  });

  const aprovados = stories.filter((s) => s.status === "aprovado").length;
  const visiveis = useMemo(
    () => (filtro === "todos" ? stories : stories.filter((s) => s.status === filtro)),
    [stories, filtro],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  async function enviar(files: File[]) {
    setUploading(true);
    try {
      await createStoriesFromFiles(files);
      await normalize();
      await refresh();
      toast.success(`${files.length} story(s) adicionado(s)`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current as { type: string }) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const active = event.active.data.current as
      | { type: string; storyId: string; frameId?: string; index?: number }
      | undefined;
    const over = event.over?.data.current as
      | { type: string; storyId?: string; frameId?: string; index?: number }
      | undefined;
    if (!active || !over || !editable) return;

    const byId = (id?: string) => stories.find((s) => s.id === id);

    if (active.type === "story" && over.type === "card" && active.storyId !== over.storyId) {
      const source = byId(active.storyId);
      const target = byId(over.storyId);
      if (!source || !target) return;
      if (source.frames.length + target.frames.length > MAX_FRAMES) {
        toast.error(`A fusão passaria do limite de ${MAX_FRAMES} frames`);
        return;
      }
      mutate.mutate(async () => {
        await mergeStories(source, target);
        toast.success(`Stories #${source.position} e #${target.position} fundidos`, {
          action: {
            label: "Desfazer",
            onClick: () => {
              mutate.mutate(async () => {
                await undoMerge(source, target);
              });
            },
          },
        });
      });
      return;
    }

    if (active.type === "frame" && active.frameId) {
      const frameId = active.frameId;
      const source = byId(active.storyId);
      if (!source) return;

      if (over.type === "new-story") {
        if (source.frames.length === 1) return;
        mutate.mutate(() => splitFrame(frameId));
        return;
      }

      if (over.type === "frameslot") {
        if (over.storyId === active.storyId) {
          const ids = source.frames.map((f) => f.id);
          const from = ids.indexOf(frameId);
          const to = ids.indexOf(over.frameId ?? "");
          if (from < 0 || to < 0 || from === to) return;
          ids.splice(to, 0, frameId);
          ids.splice(from > to ? from + 1 : from, 1);
          mutate.mutate(() => reorderFrames(ids));
          return;
        }
        const target = byId(over.storyId);
        if (!target) return;
        mutate.mutate(() => moveFrame(frameId, target, over.index ?? target.frames.length));
        return;
      }

      if (over.type === "card" && over.storyId !== active.storyId) {
        const target = byId(over.storyId);
        if (!target) return;
        mutate.mutate(() => moveFrame(frameId, target, target.frames.length));
      }
    }
  }

  if (!podeVer) {
    return (
      <AppShell>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem permissão para ver esta aba.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Stories</h1>
            <p className="text-sm text-muted-foreground">
              <span className="tabular font-medium text-foreground">{aprovados}</span> de{" "}
              <span className="tabular">{stories.length}</span> aprovados
            </p>
          </div>

          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() =>
                  setConfirm({
                    title: "Aprovar todos os pendentes?",
                    description: "Todos os stories pendentes passarão para aprovado.",
                    action: () => mutate.mutate(() => approveAllPending(stories)),
                  })
                }
              >
                <CheckCheck className="size-4" /> Aprovar pendentes
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive"
                onClick={() =>
                  setConfirm({
                    title: "Limpar aprovados?",
                    description: "Os stories aprovados e suas imagens serão apagados de vez.",
                    action: () => mutate.mutate(() => clearApproved(stories)),
                  })
                }
              >
                <Trash2 className="size-4" /> Limpar aprovados
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-sm transition-colors",
                filtro === f.key
                  ? "border-primary bg-primary-soft font-medium text-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {editable ? <UploadArea onFiles={enviar} busy={uploading} /> : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          <NewStoryZone visible={dragging?.type === "frame"} />

          {visiveis.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-xl border border-border bg-card p-10 text-center">
              <Sparkles className="size-5 text-primary" />
              <p className="text-sm text-muted-foreground">Nenhum story neste filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visiveis.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  editable={editable}
                  onApprove={() => mutate.mutate(() => setStatus(story.id, "aprovado"))}
                  onAdjust={(comment) => mutate.mutate(() => requestAdjust(story.id, comment))}
                  onDelete={() =>
                    setConfirm({
                      title: `Apagar story #${story.position}?`,
                      description: "O story e suas imagens serão removidos de vez.",
                      action: () => mutate.mutate(() => deleteStory(story)),
                    })
                  }
                  onAddFrames={(files) =>
                    mutate.mutate(() => addFramesToStory(story.id, files, story.frames.length))
                  }
                  onOpenFrame={(index) => setLightbox(story.frames[index]?.url ?? null)}
                />
              ))}
            </div>
          )}

          <DragOverlay dropAnimation={null} />
        </DndContext>
      </div>

      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-[min(96vw,32rem)] border-none bg-transparent p-0 shadow-none">
          {lightbox ? (
            <img
              src={lightbox}
              alt="Frame do story"
              className="max-h-[85vh] w-full rounded-xl object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm?.action();
                setConfirm(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

export type { Story };
