import { useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical, Check, MessageSquare, Trash2, Plus } from "lucide-react";

import type { Story, StoryStatus } from "@/lib/stories";
import { MAX_FRAMES } from "@/lib/stories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STATUS_LABEL: Record<StoryStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  ajustar: "Ajustar",
};

const STATUS_BADGE: Record<StoryStatus, string> = {
  pendente: "bg-warning/20 text-foreground border-warning",
  aprovado: "bg-success/15 text-foreground border-success",
  ajustar: "bg-destructive/10 text-foreground border-destructive",
};

const STATUS_BORDER: Record<StoryStatus, string> = {
  pendente: "border-warning/60",
  aprovado: "border-success/60",
  ajustar: "border-destructive/60",
};

function Frame({
  frame,
  index,
  onOpen,
  editable,
}: {
  frame: Story["frames"][number];
  index: number;
  onOpen: () => void;
  editable: boolean;
}) {
  const draggable = useDraggable({
    id: `frame:${frame.id}`,
    data: { type: "frame", frameId: frame.id, storyId: frame.story_id, index },
    disabled: !editable,
  });
  const droppable = useDroppable({
    id: `frameslot:${frame.id}`,
    data: { type: "frameslot", frameId: frame.id, storyId: frame.story_id, index },
  });

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        "relative aspect-[9/16] flex-1 overflow-hidden rounded-lg border border-border bg-muted",
        droppable.isOver && "ring-2 ring-primary",
        draggable.isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        ref={draggable.setNodeRef}
        {...draggable.attributes}
        {...draggable.listeners}
        onClick={onOpen}
        className="size-full touch-none"
        aria-label={`Abrir frame ${index + 1}`}
      >
        {frame.url ? (
          <img src={frame.url} alt={`Frame ${index + 1}`} className="size-full object-cover" />
        ) : null}
      </button>
      <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-foreground/70 px-1 text-[10px] font-medium text-background">
        {index + 1}
      </span>
    </div>
  );
}

export function StoryCard({
  story,
  editable,
  onApprove,
  onAdjust,
  onDelete,
  onAddFrames,
  onOpenFrame,
}: {
  story: Story;
  editable: boolean;
  onApprove: () => void;
  onAdjust: (comment: string) => void;
  onDelete: () => void;
  onAddFrames: (files: File[]) => void;
  onOpenFrame: (index: number) => void;
}) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [comment, setComment] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const draggable = useDraggable({
    id: `story:${story.id}`,
    data: { type: "story", storyId: story.id },
    disabled: !editable,
  });
  const droppable = useDroppable({
    id: `card:${story.id}`,
    data: { type: "card", storyId: story.id },
  });

  const full = story.frames.length >= MAX_FRAMES;

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-xl border-2 bg-card p-3 shadow-soft transition-shadow",
        STATUS_BORDER[story.status],
        droppable.isOver && "ring-2 ring-primary ring-offset-2",
        draggable.isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          ref={draggable.setNodeRef}
          {...draggable.attributes}
          {...draggable.listeners}
          className={cn(
            "touch-none rounded-md p-1 text-muted-foreground",
            editable ? "cursor-grab hover:bg-secondary" : "cursor-not-allowed opacity-40",
          )}
          aria-label="Arrastar story"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="tabular text-sm font-semibold">#{story.position}</span>
        <span
          className={cn(
            "ml-auto rounded-full border px-2 py-0.5 text-[11px] font-medium",
            STATUS_BADGE[story.status],
          )}
        >
          {STATUS_LABEL[story.status]}
        </span>
      </div>

      <div className="flex gap-1.5">
        {story.frames.map((frame, index) => (
          <Frame
            key={frame.id}
            frame={frame}
            index={index}
            editable={editable}
            onOpen={() => onOpenFrame(index)}
          />
        ))}
        {editable && !full ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid aspect-[9/16] flex-1 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Adicionar frame"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>

      {story.adjust_comment ? (
        <div className="rounded-lg bg-destructive/5 p-2 text-xs">
          <p className="whitespace-pre-wrap">{story.adjust_comment}</p>
          {story.adjust_comment_at ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(story.adjust_comment_at).toLocaleString("pt-BR")}
            </p>
          ) : null}
        </div>
      ) : null}

      {editable ? (
        <>
          {adjustOpen ? (
            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="O que precisa ser ajustado?"
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={comment.trim().length === 0}
                  onClick={() => {
                    onAdjust(comment.trim());
                    setComment("");
                    setAdjustOpen(false);
                  }}
                >
                  Confirmar ajuste
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={story.status === "aprovado" ? "secondary" : "default"}
                className="flex-1 gap-1"
                onClick={onApprove}
              >
                <Check className="size-3.5" /> Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => setAdjustOpen(true)}
              >
                <MessageSquare className="size-3.5" /> Ajuste
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={onDelete}
                aria-label="Apagar story"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (files.length > 0) onAddFrames(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
