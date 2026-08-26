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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCheck,
  Layers,
  FileDown,
  FileUp,
  Save,
  Loader2,
  Archive,
  ArchiveRestore,
  ChevronDown,
  Inbox,
  ArrowDownAZ,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StoryCard } from "@/components/stories/StoryCard";
import { UploadArea } from "@/components/stories/UploadArea";
import { PlanDialog } from "@/components/stories/PlanDialog";
import { canEdit, profileQueryOptions, hasPermission } from "@/lib/auth";
import {
  MAX_FRAMES,
  addFramesToStory,
  approveAllPending,
  approveFrame,
  approveStory,
  createStoriesFromFiles,
  deleteSequence,
  deleteStory,
  mergeStories,
  moveFrame,
  normalize,
  renameSequence,
  reorderFrames,
  reorderStories,
  replaceFrameImage,
  requestFrameAdjust,
  saveAsSequence,
  sequencesQueryOptions,
  setDescartado,
  setSequenceArquivado,
  setStoryObjective,
  sortStoriesByName,
  splitFrame,
  storiesQueryOptions,
  undoMerge,
  updateFrameTexts,
  updateStoryBloco,
  type Frame,
  type Story,
  type StoryStatus,
} from "@/lib/stories";

import { objectivesQueryOptions, type Objective } from "@/lib/objectives";
import { applyPlan, type PlanValidation } from "@/lib/story-plan";
import { exportPlanPdf } from "@/lib/story-pdf";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
          "Planejamento editorial de stories da Juff: projetos salvos, textos por arte, exportação em PDF e importação do plano.",
      },
      { property: "og:title", content: "Stories — Marketing Juff" },
      {
        property: "og:description",
        content: "Projetos, textos, PDF e plano editorial dos stories da Juff.",
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

function DropZone({
  id,
  type,
  visible,
  label,
  icon,
}: {
  id: string;
  type: string;
  visible: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type } });
  if (!visible) return null;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid min-h-[6rem] place-items-center rounded-xl border-2 border-dashed border-primary/50 bg-primary-soft/50 text-sm text-primary",
        isOver && "border-primary bg-primary-soft",
      )}
    >
      <span className="flex items-center gap-2">
        {icon} {label}
      </span>
    </div>
  );
}

function StoriesPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const queryClient = useQueryClient();

  const podeVer = hasPermission(profile, "social.stories");
  const editable = canEdit(profile, "social.stories");
  const canApprove = editable && (profile?.role === "admin" || profile?.role === "gestor");

  const [sequenceId, setSequenceId] = useState<string | null>(null);
  const { data: sequences = [] } = useQuery(sequencesQueryOptions);
  const { data: stories = [], isLoading } = useQuery(storiesQueryOptions(sequenceId));
  const { data: objetivos = [] } = useQuery(objectivesQueryOptions);
  const objetivosAtivos = useMemo(
    () => objetivos.filter((o: Objective) => !o.arquivado),
    [objetivos],
  );


  const projetoAtual = sequences.find((s) => s.id === sequenceId) ?? null;
  const nomeAtual = projetoAtual?.nome ?? "Área de trabalho";

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [dragging, setDragging] = useState<{ type: string; descartado?: boolean } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [planoAberto, setPlanoAberto] = useState(false);
  const [salvarAberto, setSalvarAberto] = useState(false);
  const [renomearAberto, setRenomearAberto] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [confirmaNome, setConfirmaNome] = useState("");
  const [exportAberto, setExportAberto] = useState(false);
  const [quantidade, setQuantidade] = useState("0");
  /** Objetivos marcados na exportação. null = todos marcados. */
  const [objetivosPdf, setObjetivosPdf] = useState<string[] | null>(null);
  const [nomeProjeto, setNomeProjeto] = useState("");

  const [pendentes, setPendentes] = useState<File[] | null>(null);
  const [naoUsadasAberto, setNaoUsadasAberto] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  const fila = useMemo(() => stories.filter((s) => !s.descartado), [stories]);
  const descartadas = useMemo(() => stories.filter((s) => s.descartado), [stories]);

  const visiveisProjetos = useMemo(
    () => sequences.filter((s) => (mostrarArquivados ? true : !s.arquivado)),
    [sequences, mostrarArquivados],
  );

  // Se o projeto aberto sumir da lista visível, volta para a Área de trabalho.
  useEffect(() => {
    if (sequenceId && !sequences.some((s) => s.id === sequenceId)) setSequenceId(null);
  }, [sequenceId, sequences]);

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

  const aprovados = fila.filter((s) => s.status === "aprovado").length;
  const visiveis = useMemo(
    () => (filtro === "todos" ? fila : fila.filter((s) => s.status === filtro)),
    [fila, filtro],
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
    setNomeProjeto("");
    setPendentes(files);
  }

  async function salvarProjeto(nome: string) {
    try {
      const projeto = await saveAsSequence(nome, fila);
      await refresh();
      setSequenceId(projeto.id);
      toast.success(`Projeto "${nome}" salvo`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function criarProjetoComArquivos(nome: string, files: File[]) {
    setUploading(true);
    try {
      const { createSequence } = await import("@/lib/stories");
      const projeto = await createSequence(nome);
      await createStoriesFromFiles(files, projeto.id);
      await normalize(projeto.id);
      await refresh();
      setSequenceId(projeto.id);
      toast.success(`Projeto "${nome}" criado com ${files.length} arte(s)`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function exportar(qtd: number, escolhidos: Objective[], todos: boolean) {
    setExportando(true);
    try {
      await exportPlanPdf(fila, nomeAtual, qtd, escolhidos, todos);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExportando(false);
    }
  }

  function definirObjetivo(storyId: string, objectiveId: string | null) {
    const anterior = stories.find((s) => s.id === storyId)?.objective_id ?? null;
    patchLocal((s) => (s.id === storyId ? { ...s, objective_id: objectiveId } : s));
    void setStoryObjective(storyId, objectiveId).catch((error: Error) => {
      patchLocal((s) => (s.id === storyId ? { ...s, objective_id: anterior } : s));
      toast.error(error.message);
    });
  }


  function aplicarPlano(validation: PlanValidation) {
    setPlanoAberto(false);
    mutate.mutate(async () => {
      await applyPlan(validation, stories, sequenceId);
      toast.success(
        `Plano aplicado: ${validation.blocos.length} bloco(s) e ${validation.sobras.length} arte(s) não utilizada(s)`,
      );
    });
  }

  /** Atualiza só o dado local, sem remontar os cards enquanto a pessoa digita. */
  function patchLocal(fn: (story: Story) => Story) {
    queryClient.setQueryData<Story[]>(["stories", sequenceId], (old) => old?.map(fn));
  }

  async function salvarBloco(storyId: string, nome: string) {
    try {
      await updateStoryBloco(storyId, nome);
      patchLocal((s) => (s.id === storyId ? { ...s, nome_bloco: nome } : s));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function salvarFrame(frameId: string, values: Partial<Frame>) {
    const frame = stories.flatMap((s) => s.frames).find((f) => f.id === frameId);
    if (!frame) return;
    try {
      await updateFrameTexts(frameId, {
        texto_principal: values.texto_principal ?? frame.texto_principal,
        observacao: values.observacao ?? frame.observacao,
        recurso: values.recurso ?? frame.recurso,
      });
      patchLocal((s) => ({
        ...s,
        frames: s.frames.map((f) => (f.id === frameId ? { ...f, ...values } : f)),
      }));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current as { type: string }) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const active = event.active.data.current as
      | { type: string; storyId: string; frameId?: string; index?: number; descartado?: boolean }
      | undefined;
    const over = event.over?.data.current as
      { type: string; storyId?: string; frameId?: string; index?: number } | undefined;
    if (!active || !over || !editable) return;

    const byId = (id?: string) => stories.find((s) => s.id === id);

    if (active.type === "story" && over.type === "descartar") {
      const story = byId(active.storyId);
      if (!story || story.descartado) return;
      mutate.mutate(() => setDescartado(story.id, true));
      return;
    }

    if (active.type === "story" && over.type === "storyslot" && active.storyId !== over.storyId) {
      const story = byId(active.storyId);
      if (!story) return;

      if (story.descartado) {
        // Volta para a fila principal na posição escolhida.
        const ids = fila.map((s) => s.id);
        const to = ids.indexOf(over.storyId ?? "");
        if (to < 0) return;
        ids.splice(to, 0, story.id);
        mutate.mutate(async () => {
          await setDescartado(story.id, false);
          await reorderStories(ids);
        });
        return;
      }

      const ids = fila.map((s) => s.id);
      const from = ids.indexOf(active.storyId);
      const to = ids.indexOf(over.storyId ?? "");
      if (from < 0 || to < 0) return;
      ids.splice(from, 1);
      ids.splice(ids.indexOf(over.storyId ?? ""), 0, active.storyId);
      mutate.mutate(() => reorderStories(ids));
      return;
    }

    if (active.type === "story" && over.type === "card" && active.storyId !== over.storyId) {
      const source = byId(active.storyId);
      const target = byId(over.storyId);
      if (!source || !target) return;
      if (source.descartado !== target.descartado) return;
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

  function cardProps(story: Story) {
    return {
      story,
      editable,
      canApprove,
      objetivos: objetivosAtivos,
      onSetObjective: (storyId: string, objectiveId: string | null) =>
        definirObjetivo(storyId, objectiveId),
      onSaveBloco: salvarBloco,
      onSaveFrame: salvarFrame,

      onApproveFrame: (frameId: string) => mutate.mutate(() => approveFrame(frameId)),
      onApproveStory: () => {
        const total = story.frames.length;
        const ajustes = story.frames.filter((f) => f.status === "ajustar").length;
        setConfirm({
          title: `Aprovar bloco #${story.position}?`,
          description:
            `${total} ${total === 1 ? "arte" : "artes"} serão aprovadas, sem exceção.` +
            (ajustes > 0
              ? ` ${ajustes} ${ajustes === 1 ? "arte tem" : "artes têm"} pedido de ajuste em aberto e o pedido será descartado.`
              : ""),
          action: () => mutate.mutate(() => approveStory(story)),
        });
      },
      onAdjustFrame: (frameId: string, comment: string) =>
        mutate.mutate(() => requestFrameAdjust(frameId, comment)),
      onReplaceImage: (frame: Frame, file: File) =>
        mutate.mutate(() => replaceFrameImage(frame, file)),
      onDelete: () =>
        setConfirm({
          title: `Apagar story #${story.position}?`,
          description: "O story e suas imagens serão removidos de vez.",
          action: () => mutate.mutate(() => deleteStory(story)),
        }),
      onAddFrames: (files: File[]) =>
        mutate.mutate(() => addFramesToStory(story.id, files, story.frames.length)),
      onOpenFrame: (index: number) => setLightbox(story.frames[index]?.url ?? null),
    };
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
              {nomeAtual}
              {projetoAtual?.arquivado ? " (arquivado)" : ""} ·{" "}
              <span className="tabular font-medium text-foreground">{aprovados}</span> de{" "}
              <span className="tabular">{fila.length}</span> aprovados
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
                {visiveisProjetos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                    {s.arquivado ? " (arquivado)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={mostrarArquivados}
                onCheckedChange={(v) => setMostrarArquivados(v === true)}
              />
              Mostrar arquivados
            </label>

            {editable && !sequenceId && fila.length > 0 ? (
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setNomeProjeto("");
                  setSalvarAberto(true);
                }}
              >
                <Save className="size-4" /> Salvar projeto
              </Button>
            ) : null}

            {editable && projetoAtual ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNomeProjeto(projetoAtual.nome);
                    setRenomearAberto(true);
                  }}
                >
                  Renomear projeto
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() =>
                    mutate.mutate(() =>
                      setSequenceArquivado(projetoAtual.id, !projetoAtual.arquivado),
                    )
                  }
                >
                  {projetoAtual.arquivado ? (
                    <>
                      <ArchiveRestore className="size-4" /> Desarquivar projeto
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" /> Arquivar projeto
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    setConfirmaNome("");
                    setExcluirAberto(true);
                  }}
                >
                  Excluir projeto
                </Button>
              </>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={fila.length === 0 || exportando}
              onClick={() => {
                setQuantidade(String(fila.length));
                setObjetivosPdf(null);
                setExportAberto(true);
              }}

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
            {canApprove ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() =>
                  setConfirm({
                    title: "Aprovar todos os pendentes?",
                    description: `Aprova as artes em pendente e em refeito da fila principal de ${nomeAtual}. Artes em ajuste não são tocadas.`,
                    action: () => mutate.mutate(() => approveAllPending(fila)),
                  })
                }
              >
                <CheckCheck className="size-4" /> Aprovar pendentes
              </Button>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={fila.length < 2}
              onClick={() =>
                setConfirm({
                  title: "Ordenar por nome?",
                  description:
                    "A fila principal é reordenada pelo nome do arquivo da primeira arte de cada story e renumerada de 1 em diante. Fusões, artes não utilizadas e demais projetos não são alterados.",
                  action: () =>
                    mutate.mutate(async () => {
                      await sortStoriesByName(sequenceId);
                    }),
                })
              }
            >
              <ArrowDownAZ className="size-4" /> Ordenar por nome
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
          <DropZone
            id="new-story"
            type="new-story"
            visible={dragging?.type === "frame"}
            label="Solte aqui para criar um story novo"
            icon={<Layers className="size-4" />}
          />

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
                  {...cardProps(story)}
                  showSlot={dragging?.type === "story" && filtro === "todos"}
                />
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <DropZone
              id="descartar"
              type="descartar"
              visible={dragging?.type === "story"}
              label="Solte aqui para marcar como não utilizada"
              icon={<Inbox className="size-4" />}
            />

            {descartadas.length > 0 ? (
              <div className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setNaoUsadasAberto((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium"
                >
                  <span>Não utilizadas ({descartadas.length})</span>
                  <ChevronDown
                    className={cn("size-4 transition-transform", naoUsadasAberto && "rotate-180")}
                  />
                </button>
                {naoUsadasAberto ? (
                  <div className="grid grid-cols-1 gap-3 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {descartadas.map((story) => (
                      <StoryCard key={story.id} {...cardProps(story)} showSlot={false} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DragOverlay dropAnimation={null} />
        </DndContext>
      </div>

      <PlanDialog
        open={planoAberto}
        stories={stories}
        objetivos={objetivosAtivos}

        onOpenChange={setPlanoAberto}
        onApply={aplicarPlano}
      />

      <Dialog open={exportAberto} onOpenChange={setExportAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quantos stories você quer no plano?</DialogTitle>
            <DialogDescription>
              O PDF leva as {fila.length} arte(s) da fila principal. As não utilizadas ficam de
              fora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="qtd">Quantidade de stories</Label>
            <Input
              id="qtd"
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          {objetivosAtivos.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Objetivos permitidos</Label>
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() => setObjetivosPdf(null)}
                >
                  Marcar todos
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Com todos marcados, o PDF pede distribuição livre entre os objetivos. Marcando
                apenas alguns, o PDF pede para usar somente esses.
              </p>
              <div className="space-y-1.5 rounded-xl border border-border p-3">
                {objetivosAtivos.map((o) => {
                  const marcado = objetivosPdf === null || objetivosPdf.includes(o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={marcado}
                        onCheckedChange={(v) => {
                          const atuais =
                            objetivosPdf === null ? objetivosAtivos.map((x) => x.id) : objetivosPdf;
                          setObjetivosPdf(
                            v === true ? [...new Set([...atuais, o.id])] : atuais.filter((id) => id !== o.id),
                          );
                        }}
                      />
                      {o.nome}
                    </label>
                  );
                })}
              </div>
              {objetivosPdf !== null && objetivosPdf.length === 0 ? (
                <p className="text-xs text-destructive">
                  Mantenha pelo menos um objetivo marcado para exportar.
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportAberto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                objetivosAtivos.length > 0 && objetivosPdf !== null && objetivosPdf.length === 0
              }
              onClick={() => {
                const qtd = Math.max(1, Number.parseInt(quantidade, 10) || fila.length);
                const todos = objetivosPdf === null || objetivosPdf.length === objetivosAtivos.length;
                const escolhidos =
                  objetivosPdf === null
                    ? objetivosAtivos
                    : objetivosAtivos.filter((o) => objetivosPdf.includes(o.id));
                setExportAberto(false);
                void exportar(qtd, escolhidos, todos);
              }}
            >
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={salvarAberto} onOpenChange={setSalvarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar projeto</DialogTitle>
            <DialogDescription>
              Os {fila.length} story(s) da área de trabalho vão para este projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nome-proj">Nome</Label>
            <Input
              id="nome-proj"
              value={nomeProjeto}
              onChange={(e) => setNomeProjeto(e.target.value)}
              placeholder="Semana 1 de outubro"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSalvarAberto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!nomeProjeto.trim()}
              onClick={() => {
                const nome = nomeProjeto.trim();
                setSalvarAberto(false);
                void salvarProjeto(nome);
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
            <DialogTitle>Renomear projeto</DialogTitle>
            <DialogDescription>Escolha um nome novo para este projeto.</DialogDescription>
          </DialogHeader>
          <Input value={nomeProjeto} onChange={(e) => setNomeProjeto(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenomearAberto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!nomeProjeto.trim() || !projetoAtual}
              onClick={() => {
                const nome = nomeProjeto.trim();
                const id = projetoAtual?.id;
                setRenomearAberto(false);
                if (id) mutate.mutate(() => renameSequence(id, nome));
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={excluirAberto} onOpenChange={setExcluirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir projeto "{projetoAtual?.nome}"?</DialogTitle>
            <DialogDescription>
              {stories.reduce((acc, s) => acc + s.frames.length, 0)} arte(s) serão perdidas, junto
              com as imagens. Esta é a única ação que apaga alguma coisa e não tem volta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirma">Digite o nome do projeto para confirmar</Label>
            <Input
              id="confirma"
              value={confirmaNome}
              onChange={(e) => setConfirmaNome(e.target.value)}
              placeholder={projetoAtual?.nome}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluirAberto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmaNome.trim() !== (projetoAtual?.nome ?? "")}
              onClick={() => {
                const id = projetoAtual?.id;
                setExcluirAberto(false);
                setConfirmaNome("");
                if (!id) return;
                setSequenceId(null);
                mutate.mutate(() => deleteSequence(id));
              }}
            >
              Excluir de vez
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendentes !== null} onOpenChange={(open) => !open && setPendentes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onde colocar estas artes?</DialogTitle>
            <DialogDescription>
              {pendentes?.length ?? 0} arquivo(s) com o projeto "{nomeAtual}" aberto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nome-novo">Nome do projeto novo (opcional)</Label>
            <Input
              id="nome-novo"
              value={nomeProjeto}
              onChange={(e) => setNomeProjeto(e.target.value)}
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
              Adicionar neste projeto
            </Button>
            <Button
              disabled={!nomeProjeto.trim()}
              onClick={() => {
                const files = pendentes ?? [];
                const nome = nomeProjeto.trim();
                setPendentes(null);
                setNomeProjeto("");
                void criarProjetoComArquivos(nome, files);
              }}
            >
              Criar projeto novo
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
