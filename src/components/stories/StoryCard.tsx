import { useEffect, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical, Check, CheckCheck, MessageSquare, Trash2, Plus, ImageUp } from "lucide-react";

import type { Frame as FrameType, FrameStatus, Recurso, Story } from "@/lib/stories";
import { MAX_FRAMES, RECURSOS, blocoTipo } from "@/lib/stories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FRAME_STATUS_LABEL: Record<FrameStatus, string> = {
  pendente: "Pendente",
  ajustar: "Ajustar",
  refeito: "Refeito",
  aprovado: "Aprovado",
};

const FRAME_STATUS_BADGE: Record<FrameStatus, string> = {
  pendente: "bg-muted text-muted-foreground border-border",
  ajustar: "bg-warning/25 text-foreground border-warning",
  refeito: "bg-success/15 text-foreground border-success/50",
  aprovado: "bg-success text-background border-success",
};

const STATUS_BORDER: Record<Story["status"], string> = {
  pendente: "border-warning/60",
  aprovado: "border-success/60",
  ajustar: "border-destructive/60",
};

/** Impede que digitar ou selecionar texto inicie o arraste do dnd-kit. */
const stopDrag = {
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
  onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
};

function Salvo({ visivel }: { visivel: boolean }) {
  if (!visivel) return null;
  return <span className="text-[10px] font-medium text-success">Salvo</span>;
}

/** Campo de várias linhas que cresce sozinho e grava só quando perde o foco. */
function AutoTextarea({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onCommit: (v: string) => Promise<void>;
}) {
  const [local, setLocal] = useState(value);
  const [salvo, setSalvo] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [local]);

  return (
    <div className="space-y-1" {...stopDrag}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Salvo visivel={salvo} />
      </div>
      <Textarea
        ref={ref}
        rows={2}
        value={local}
        disabled={disabled}
        className="min-h-0 resize-y text-sm"
        onChange={(e) => setLocal(e.target.value)}
        onBlur={async () => {
          if (local === value) return;
          await onCommit(local);
          setSalvo(true);
          setTimeout(() => setSalvo(false), 2000);
        }}
      />
    </div>
  );
}

function ArteBloco({
  frame,
  index,
  total,
  editable,
  canApprove,
  onOpen,
  onSaveFrame,
  onApproveFrame,
  onAdjustFrame,
  onReplaceImage,
}: {
  frame: FrameType;
  index: number;
  total: number;
  editable: boolean;
  canApprove: boolean;
  onOpen: () => void;
  onSaveFrame: (frameId: string, values: Partial<FrameType>) => Promise<void>;
  onApproveFrame: (frameId: string) => void;
  onAdjustFrame: (frameId: string, comment: string) => void;
  onReplaceImage: (frame: FrameType, file: File) => void;
}) {
  const [ajusteAberto, setAjusteAberto] = useState(false);
  const [comentario, setComentario] = useState("");
  
  const [recursoSalvo, setRecursoSalvo] = useState(false);
  const trocaRef = useRef<HTMLInputElement>(null);

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
    <div className="space-y-2 rounded-lg border border-border p-2">
      <div
        ref={droppable.setNodeRef}
        className={cn(
          "relative mx-auto aspect-[9/16] w-full max-w-[13rem] overflow-hidden rounded-lg border border-border bg-muted",

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
          aria-label={`Abrir arte ${index + 1}`}
        >
          {frame.url ? (
            <img src={frame.url} alt={`Arte ${index + 1}`} className="size-full object-cover" />
          ) : null}
        </button>
        <span
          className={cn(
            "pointer-events-none absolute right-1 top-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            FRAME_STATUS_BADGE[frame.status],
          )}
        >
          {FRAME_STATUS_LABEL[frame.status]}
        </span>
      </div>

      <p className="truncate text-[11px] text-muted-foreground" title={frame.nome_arquivo}>
        {frame.nome_arquivo || "Sem nome"} · {index + 1}/{total}
      </p>

      {frame.adjust_comment ? (
        <div className="rounded-lg bg-warning/20 p-2 text-xs">
          <p className="whitespace-pre-wrap">{frame.adjust_comment}</p>
          {frame.adjust_comment_at ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(frame.adjust_comment_at).toLocaleString("pt-BR")}
            </p>
          ) : null}
        </div>
      ) : null}


      <AutoTextarea
        label="Texto principal"
        value={frame.texto_principal}
        disabled={!editable}
        onCommit={(v) => onSaveFrame(frame.id, { texto_principal: v })}
      />
      <AutoTextarea
        label="Observação"
        value={frame.observacao}
        disabled={!editable}
        onCommit={(v) => onSaveFrame(frame.id, { observacao: v })}
      />

      <div className="space-y-1" {...stopDrag}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Recurso</span>
          <Salvo visivel={recursoSalvo} />
        </div>
        <Select
          value={frame.recurso}
          disabled={!editable}
          onValueChange={async (v) => {
            if (v === frame.recurso) return;
            await onSaveFrame(frame.id, { recurso: v as Recurso });
            setRecursoSalvo(true);
            setTimeout(() => setRecursoSalvo(false), 2000);
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURSOS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {editable ? (
        ajusteAberto ? (
          <div className="space-y-2" {...stopDrag}>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="O que precisa ser ajustado?"
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={comentario.trim().length === 0}
                onClick={() => {
                  onAdjustFrame(frame.id, comentario.trim());
                  setComentario("");
                  setAjusteAberto(false);
                }}
              >
                Confirmar ajuste
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAjusteAberto(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {canApprove ? (
              <>
                <Button
                  size="sm"
                  variant={frame.status === "aprovado" ? "secondary" : "default"}
                  className="gap-1"
                  onClick={() => onApproveFrame(frame.id)}
                >
                  <Check className="size-3.5" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setAjusteAberto(true)}
                >
                  <MessageSquare className="size-3.5" /> Ajuste
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => trocaRef.current?.click()}
            >
              <ImageUp className="size-3.5" /> Trocar imagem
            </Button>
            <input
              ref={trocaRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file && file.type.startsWith("image/")) onReplaceImage(frame, file);
              }}
            />
          </div>
        )
      ) : null}

    </div>
  );
}

export function StoryCard({
  story,
  editable,
  canApprove,
  showSlot,
  onDelete,
  onAddFrames,
  onOpenFrame,
  onSaveBloco,
  onSaveFrame,
  onApproveFrame,
  onApproveStory,
  onAdjustFrame,
  onReplaceImage,
}: {
  story: Story;
  editable: boolean;
  canApprove: boolean;
  showSlot?: boolean;
  onDelete: () => void;
  onAddFrames: (files: File[]) => void;
  onOpenFrame: (index: number) => void;
  onSaveBloco: (storyId: string, nome: string) => Promise<void>;
  onSaveFrame: (frameId: string, values: Partial<FrameType>) => Promise<void>;
  onApproveFrame: (frameId: string) => void;
  onApproveStory: () => void;
  onAdjustFrame: (frameId: string, comment: string) => void;
  onReplaceImage: (frame: FrameType, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nomeBloco, setNomeBloco] = useState(story.nome_bloco);
  const [blocoSalvo, setBlocoSalvo] = useState(false);

  useEffect(() => setNomeBloco(story.nome_bloco), [story.nome_bloco]);

  const draggable = useDraggable({
    id: `story:${story.id}`,
    data: { type: "story", storyId: story.id },
    disabled: !editable,
  });
  const droppable = useDroppable({
    id: `card:${story.id}`,
    data: { type: "card", storyId: story.id },
  });
  const slot = useDroppable({
    id: `storyslot:${story.id}`,
    data: { type: "storyslot", storyId: story.id },
  });

  const full = story.frames.length >= MAX_FRAMES;
  const campanha = blocoTipo(story) === "CAMPANHA";
  const titulo = campanha
    ? story.nome_bloco || "Sem nome do bloco"
    : story.frames[0]?.nome_arquivo || "Sem nome";

  const total = story.frames.length;
  const aprovadas = story.frames.filter((f) => f.status === "aprovado").length;
  const emAjuste = story.frames.filter((f) => f.status === "ajustar").length;
  const tudoAprovado = total > 0 && aprovadas === total;

  return (
    <div className="relative">
      {showSlot ? (
        <div
          ref={slot.setNodeRef}
          className={cn(
            "absolute -left-2 top-0 z-10 h-full w-4 rounded-full transition-colors",
            slot.isOver ? "bg-primary" : "bg-primary/10",
          )}
          aria-label="Mover para antes deste story"
        />
      ) : null}
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

          <div className="min-w-0 flex-1" title={titulo}>
            <span className="block truncate text-sm font-semibold">{titulo}</span>
            <span className="block text-[11px] text-muted-foreground">
              {campanha ? `CAMPANHA • ${total} artes` : "SOLO"}
            </span>
          </div>

          <span className="tabular rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {story.position}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {tudoAprovado ? (
            <span className="rounded-full border border-success bg-success px-2 py-0.5 text-[11px] font-medium text-background">
              Aprovado
            </span>
          ) : (
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {aprovadas} de {total} aprovadas
            </span>
          )}
          {emAjuste > 0 ? (
            <span className="rounded-full border border-warning bg-warning/25 px-2 py-0.5 text-[11px] font-medium">
              {emAjuste} em ajuste
            </span>
          ) : null}
          {canApprove && total > 0 && !tudoAprovado ? (
            <Button size="sm" className="ml-auto gap-1" onClick={onApproveStory} {...stopDrag}>
              <CheckCheck className="size-3.5" /> Aprovar bloco
            </Button>
          ) : null}
        </div>

        <div className="space-y-1" {...stopDrag}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Nome do bloco</span>
            <Salvo visivel={blocoSalvo} />
          </div>
          <Input
            value={nomeBloco}
            disabled={!editable}
            placeholder="Nome do bloco"
            className="h-8 text-sm"
            onChange={(e) => setNomeBloco(e.target.value)}
            onBlur={async () => {
              if (nomeBloco === story.nome_bloco) return;
              await onSaveBloco(story.id, nomeBloco);
              setBlocoSalvo(true);
              setTimeout(() => setBlocoSalvo(false), 2000);
            }}
          />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
          {story.frames.map((frame, index) => (
            <ArteBloco
              key={frame.id}
              frame={frame}
              index={index}
              total={total}
              editable={editable}
              canApprove={canApprove}
              onOpen={() => onOpenFrame(index)}
              onSaveFrame={onSaveFrame}
              onApproveFrame={onApproveFrame}
              onAdjustFrame={onAdjustFrame}
              onReplaceImage={onReplaceImage}
            />
          ))}
        </div>

        {editable ? (
          <div className="flex items-center gap-1.5">
            {!full ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => inputRef.current?.click()}
              >
                <Plus className="size-4" /> Adicionar arte
              </Button>
            ) : null}
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
    </div>
  );
}
