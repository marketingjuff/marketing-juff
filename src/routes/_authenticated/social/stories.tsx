import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
import { Sparkles, Trash2, CheckCheck, Layers, FileDown, FileUp, Save, Loader2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StoryCard } from "@/components/stories/StoryCard";
import { UploadArea } from "@/components/stories/UploadArea";
import { StoryEditor, type StoryEditValues } from "@/components/stories/StoryEditor";
import { PlanDialog } from "@/components/stories/PlanDialog";
import { canEdit, profileQueryOptions, hasPermission } from "@/lib/auth";
import {
  MAX_FRAMES,
  addFramesToStory,
  approveAllPending,
  clearApproved,
  createStoriesFromFiles,
  deleteSequence,
  deleteStory,
  mergeStories,
  moveFrame,
  normalize,
  renameSequence,
  reorderFrames,
  reorderStories,
  requestAdjust,
  saveAsSequence,
  sequencesQueryOptions,
  setStatus,
  splitFrame,
  storiesQueryOptions,
  undoMerge,
  updateFrameTexts,
  updateStoryBloco,
  type Story,
  type StoryStatus,
} from "@/lib/stories";
import { applyPlan, type PlanValidation } from "@/lib/story-plan";
import { exportPlanPdf } from "@/lib/story-pdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/social/stories")({
  head: () => ({
    meta: [
      { title: "Stories — Marketing Juff" },
      {
        name: "description",
        content:
          "Planejamento editorial de stories da Juff: sequências salvas, textos por arte, exportação em PDF e importação do plano.",
      },
      { property: "og:title", content: "Stories — Marketing Juff" },
      {
        property: "og:description",
        content: "Sequências, textos, PDF e plano editorial dos stories da Juff.",
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

const AREA = "__area__";

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
  const queryClient = useQueryClient();

  const podeVer = hasPermission(profile, "social.stories");
  const editable = canEdit(profile, "social.stories");

  const [sequenceId, setSequenceId] = useState<string | null>(null);
  const { data: sequences = [] } = useQuery(sequencesQueryOptions);
  const { data: stories = [], isLoading } = useQuery(storiesQueryOptions(sequenceId));

  const sequenciaAtual = sequences.find((s) => s.id === sequenceId) ?? null;
  const nomeAtual = sequenciaAtual?.nome ?? "Área de trabalho";

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [uploading, setUploading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [dragging, setDragging] = useState<{ type: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editando, setEditando] = useState<Story | null>(null);
  const [planoAberto, setPlanoAberto] = useState(false);
  const [salvarAberto, setSalvarAberto] = useState(false);
  const [renomearAberto, setRenomearAberto] = useState(false);
  const [nomeSequencia, setNomeSequencia] = useState("");
  const [pendentes, setPendentes] = useState<File[] | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["stories"] });
    await queryClient.invalidateQueries({ queryKey: ["story-sequences"] });
  };

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => {
      await fn();
      await normalize(sequenceId);
    },
    onSuccess: refresh,
    onError: (error: Error) => {
      toast.error(error.message);
      void refresh();
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

  async function enviarPara(files: File[], destino: string | null) {
    setUploading(true);
    try {
      await createStoriesFromFiles(files, destino);
      await normalize(destino);
      await refresh();
      toast.success(`${files.length} story(s) adicionado(s)`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function receberArquivos(files: File[]) {
    if (!sequenceId) {
      void enviarPara(files, null);
      return;
    }
    setPendentes(files);
  }

  async function salvarSequencia(nome: string) {
    try {
      const sequence = await saveAsSequence(nome, stories);
      await refresh();
      setSequenceId(sequence.id);
      toast.success(`Sequência "${nome}" salva`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function criarSequenciaComArquivos(nome: string, files: File[]) {
    setUploading(true);
    try {
      const { createSequence } = await import("@/lib/stories");
      const sequence = await createSequence(nome);
      await createStoriesFromFiles(files, sequence.id);
      await normalize(sequence.id);
      await refresh();
      setSequenceId(sequence.id);
      toast.success(`Sequência "${nome}" criada com ${files.length} arte(s)`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function exportar() {
    setExportando(true);
    try {
      await exportPlanPdf(stories, nomeAtual);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExportando(false);
    }
  }

  function aplicarPlano(validation: PlanValidation) {
    setPlanoAberto(false);
    mutate.mutate(async () => {
      await applyPlan(validation.blocos, stories, sequenceId);
      toast.success(`Plano aplicado: ${validation.blocos.length} blocos`);
    });
  }

  function salvarTextos(values: StoryEditValues) {
    const story = editando;
    if (!story) return;
    setEditando(null);
    mutate.mutate(async () => {
      await updateStoryBloco(story.id, values.nome_bloco);
      for (const frame of values.frames) {
        await updateFrameTexts(frame.id, {
          texto_principal: frame.texto_principal,
          observacao: frame.observacao,
          recurso: frame.recurso,
        });
      }
    });
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

    if (active.type === "story" && over.type === "storyslot" && active.storyId !== over.storyId) {
      const ids = stories.map((s) => s.id);
      const from = ids.indexOf(active.storyId);
      const to = ids.indexOf(over.storyId ?? "");
      if (from < 0 || to < 0) return;
      ids.splice(from, 1);
      ids.splice(ids.indexOf(over.storyId ?? "") , 0, active.storyId);
      mutate.mutate(() => reorderStories(ids));
      return;
    }

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
        mutate.mutate(() => splitFrame(frameId, sequenceId));
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
              {nomeAtual} ·{" "}
              <span className="tabular font-medium text-foreground">{aprovados}</span> de{" "}
              <span className="tabular">{stories.length}</span> aprovados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={sequenceId ?? AREA}
              onValueChange={(v) => setSequenceId(v === AREA ? null : v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AREA}>Área de trabalho</SelectItem>
                {sequences.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {editable && !sequenceId && stories.length > 0 ? (
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setNomeSequencia("");
                  setSalvarAberto(true);
                }}
              >
                <Save className="size-4" /> Salvar sequência
              </Button>
            ) : null}

            {editable && sequenciaAtual ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNomeSequencia(sequenciaAtual.nome);
                    setRenomearAberto(true);
                  }}
                >
                  Renomear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() =>
                    setConfirm({
                      title: `Excluir "${sequenciaAtual.nome}"?`,
                      description: `${stories.length} story(s) e suas imagens serão apagados junto.`,
                      action: () => {
                        const id = sequenciaAtual.id;
                        setSequenceId(null);
                        mutate.mutate(() => deleteSequence(id));
                      },
                    })
                  }
                >
                  Excluir
                </Button>
              </>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={stories.length === 0 || exportando}
              onClick={exportar}
            >
              {exportando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              Exportar PDF
            </Button>

            {editable ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={stories.length === 0}
                onClick={() => setPlanoAberto(true)}
              >
                <FileUp className="size-4" /> Aplicar plano
              </Button>
            ) : null}
          </div>
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
                  description: `Vale só para ${nomeAtual}.`,
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
                  description: `Os stories aprovados de ${nomeAtual} e suas imagens serão apagados de vez.`,
                  action: () => mutate.mutate(() => clearApproved(stories)),
                })
              }
            >
              <Trash2 className="size-4" /> Limpar aprovados
            </Button>
          </div>
        ) : null}

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

        {editable ? <UploadArea onFiles={receberArquivos} busy={uploading} /> : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          <NewStoryZone visible={dragging?.type === "frame"} />

          {isLoading ? (
            <div className="grid place-items-center p-10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : visiveis.length === 0 ? (
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
                  showSlot={dragging?.type === "story" && filtro === "todos"}
                  onApprove={() => mutate.mutate(() => setStatus(story.id, "aprovado"))}
                  onAdjust={(comment) => mutate.mutate(() => requestAdjust(story.id, comment))}
                  onEdit={() => setEditando(story)}
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

      <StoryEditor
        story={editando}
        open={editando !== null}
        editable={editable}
        onOpenChange={(open) => !open && setEditando(null)}
        onSave={salvarTextos}
      />

      <PlanDialog
        open={planoAberto}
        stories={stories}
        onOpenChange={setPlanoAberto}
        onApply={aplicarPlano}
      />

      <Dialog open={salvarAberto} onOpenChange={setSalvarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar sequência</DialogTitle>
            <DialogDescription>
              Os {stories.length} story(s) da área de trabalho vão para esta sequência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nome-seq">Nome</Label>
            <Input
              id="nome-seq"
              value={nomeSequencia}
              onChange={(e) => setNomeSequencia(e.target.value)}
              placeholder="Semana 1 de outubro"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSalvarAberto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!nomeSequencia.trim()}
              onClick={() => {
                const nome = nomeSequencia.trim();
                setSalvarAberto(false);
                void salvarSequencia(nome);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renomearAberto} onOpenChange={setRenomearAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear sequência</DialogTitle>
            <DialogDescription>Escolha um nome novo para esta sequência.</DialogDescription>
          </DialogHeader>
          <Input value={nomeSequencia} onChange={(e) => setNomeSequencia(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenomearAberto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!nomeSequencia.trim() || !sequenciaAtual}
              onClick={() => {
                const nome = nomeSequencia.trim();
                const id = sequenciaAtual?.id;
                setRenomearAberto(false);
                if (id) mutate.mutate(() => renameSequence(id, nome));
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendentes !== null} onOpenChange={(open) => !open && setPendentes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onde colocar estas artes?</DialogTitle>
            <DialogDescription>
              {pendentes?.length ?? 0} arquivo(s) com a sequência "{nomeAtual}" aberta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nome-nova">Nome da sequência nova (opcional)</Label>
            <Input
              id="nome-nova"
              value={nomeSequencia}
              onChange={(e) => setNomeSequencia(e.target.value)}
              placeholder="Semana 2 de outubro"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const files = pendentes ?? [];
                setPendentes(null);
                void enviarPara(files, sequenceId);
              }}
            >
              Adicionar nesta sequência
            </Button>
            <Button
              disabled={!nomeSequencia.trim()}
              onClick={() => {
                const files = pendentes ?? [];
                const nome = nomeSequencia.trim();
                setPendentes(null);
                setNomeSequencia("");
                void criarSequenciaComArquivos(nome, files);
              }}
            >
              Criar sequência nova
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
