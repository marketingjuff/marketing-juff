import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, ZoomIn, ZoomOut } from "lucide-react";

import type { Story } from "@/lib/stories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Larguras do card em pixels, do mais compacto ao maior. */
const NIVEIS_ZOOM = [120, 160, 210, 280];
const NIVEL_PADRAO = 1;

const STATUS_BORDA: Record<Story["status"], string> = {
  pendente: "border-warning/60",
  aprovado: "border-success/60",
  ajustar: "border-destructive/60",
};

function CardMiniatura({
  story,
  indice,
  largura,
}: {
  story: Story;
  indice: number;
  largura: number;
}) {
  const sortable = useSortable({ id: story.id });

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        width: largura,
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(
        "shrink-0 cursor-grab touch-none select-none rounded-lg border-2 bg-card p-1.5",
        STATUS_BORDA[story.status],
        sortable.isDragging && "z-50 cursor-grabbing opacity-80 shadow-lg ring-2 ring-primary",
      )}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <div className="mb-1 flex items-center gap-1">
        <GripVertical className="size-3 shrink-0 text-muted-foreground" />
        <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {indice + 1}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">
          {story.frames.length} {story.frames.length === 1 ? "arte" : "artes"}
        </span>
      </div>

      <div className="flex gap-1">
        {story.frames.map((frame, i) => (
          <div
            key={frame.id}
            className="relative aspect-[9/16] min-w-0 flex-1 overflow-hidden rounded border border-border bg-muted"
          >
            {frame.url ? (
              <img
                src={frame.url}
                alt={`Arte ${i + 1}`}
                draggable={false}
                className="size-full object-cover"
              />
            ) : null}
          </div>
        ))}
      </div>

      <p
        className="mt-1 truncate text-[10px] font-medium text-foreground"
        title={story.nome_bloco || "Sem nome"}
      >
        {story.nome_bloco || "Sem nome"}
      </p>
    </div>
  );
}

export function ReorganizarDialog({
  open,
  stories,
  salvando,
  onOpenChange,
  onSalvar,
}: {
  open: boolean;
  stories: Story[];
  salvando: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (ids: string[]) => void;
}) {
  const [ordem, setOrdem] = useState<Story[]>(stories);
  const [nivel, setNivel] = useState(NIVEL_PADRAO);

  useEffect(() => {
    if (open) {
      setOrdem(stories);
      setNivel(NIVEL_PADRAO);
    }
  }, [open, stories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const mudou = stories.map((s) => s.id).join(",") !== ordem.map((s) => s.id).join(",");
  const totalArtes = ordem.reduce((acc, s) => acc + s.frames.length, 0);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrdem((lista) => {
      const de = lista.findIndex((s) => s.id === active.id);
      const para = lista.findIndex((s) => s.id === over.id);
      if (de < 0 || para < 0) return lista;
      return arrayMove(lista, de, para);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (salvando ? undefined : onOpenChange(value))}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-3 p-4">
        <DialogHeader className="shrink-0">
          <DialogTitle>Reorganizar stories</DialogTitle>
          <DialogDescription>
            Arraste os stories para definir a ordem de exportação. São {ordem.length}{" "}
            {ordem.length === 1 ? "story" : "stories"} e {totalArtes}{" "}
            {totalArtes === 1 ? "arte" : "artes"}. Nada é gravado até você salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={nivel === 0}
            onClick={() => setNivel((n) => Math.max(0, n - 1))}
          >
            <ZoomOut className="size-4" /> Diminuir
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={nivel === NIVEIS_ZOOM.length - 1}
            onClick={() => setNivel((n) => Math.min(NIVEIS_ZOOM.length - 1, n + 1))}
          >
            <ZoomIn className="size-4" /> Aumentar
          </Button>
          {mudou ? (
            <span className="text-xs font-medium text-primary">
              Ordem alterada, ainda não salva
            </span>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3">
          {ordem.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Nenhum story na fila principal.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ordem.map((s) => s.id)} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap items-start gap-2">
                  {ordem.map((story, i) => (
                    <CardMiniatura
                      key={story.id}
                      story={story}
                      indice={i}
                      largura={NIVEIS_ZOOM[nivel] ?? 160}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          <Button variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="gap-1"
            disabled={!mudou || salvando}
            onClick={() => onSalvar(ordem.map((s) => s.id))}
          >
            {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar ordem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
