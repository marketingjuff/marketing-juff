import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  deleteItemChecklist,
  registrarHistorico,
  reordenarChecklist,
  toggleItemChecklist,
  updateItemChecklist,
  type ItemChecklist,
} from "@/lib/tarefas";

type Props = { cardId: string; itens: ItemChecklist[]; mexer: boolean; onMudou: () => void };

export function ListaChecklist({ cardId, itens, mexer, onMudou }: Props) {
  const qc = useQueryClient();
  const chave = ["tarefas", "checklist", cardId];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function executar(fn: () => Promise<void>, local: (l: ItemChecklist[]) => ItemChecklist[], hist: [string, string]) {
    const antes = qc.getQueryData<ItemChecklist[]>(chave);
    qc.setQueryData<ItemChecklist[]>(chave, (l) => (l ? local(l) : l));
    try {
      await fn();
      void registrarHistorico(cardId, hist[0], hist[1]).then(() => qc.invalidateQueries({ queryKey: ["tarefas", "historico", cardId] }));
      onMudou();
    } catch (e) {
      qc.setQueryData(chave, antes);
      toast.error((e as Error).message);
    }
  }

  const salvarTexto = (i: ItemChecklist, texto: string) => {
    const t = texto.trim();
    if (t === i.texto) return;
    if (!t) return remover(i);
    void executar(() => updateItemChecklist(i.id, t), (l) => l.map((x) => (x.id === i.id ? { ...x, texto: t } : x)), ["Editou item do checklist", `"${i.texto}" → "${t}"`]);
  };
  const remover = (i: ItemChecklist) =>
    void executar(() => deleteItemChecklist(i.id), (l) => l.filter((x) => x.id !== i.id), ["Removeu item do checklist", i.texto]);
  const marcar = (i: ItemChecklist, feito: boolean) =>
    void executar(() => toggleItemChecklist(i.id, feito), (l) => l.map((x) => (x.id === i.id ? { ...x, feito } : x)), [feito ? "Marcou item do checklist" : "Desmarcou item do checklist", i.texto]);

  function aoSoltar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const de = itens.findIndex((x) => x.id === e.active.id);
    const para = itens.findIndex((x) => x.id === e.over!.id);
    if (de < 0 || para < 0) return;
    const nova = arrayMove(itens, de, para).map((x, posicao) => ({ ...x, posicao }));
    void executar(() => reordenarChecklist(nova.map((x) => x.id)), () => nova, ["Reordenou o checklist", itens[de]!.texto]);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
      <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {itens.map((i) => (
            <Linha key={i.id} item={i} mexer={mexer} onTexto={salvarTexto} onRemover={remover} onMarcar={marcar} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Linha({ item: i, mexer, onTexto, onRemover, onMarcar }: {
  item: ItemChecklist; mexer: boolean;
  onTexto: (i: ItemChecklist, t: string) => void; onRemover: (i: ItemChecklist) => void; onMarcar: (i: ItemChecklist, f: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: i.id, disabled: !mexer });
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(i.texto);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-2 rounded-md bg-background text-[17px]", isDragging && "relative z-10 opacity-80 shadow-md")}
    >
      {mexer ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Arrastar item"
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      <Checkbox checked={i.feito} disabled={!mexer} onCheckedChange={(v) => onMarcar(i, !!v)} />
      {editando ? (
        <input
          autoFocus
          value={rascunho}
          aria-label="Editar item"
          className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-[17px] outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={() => { setEditando(false); onTexto(i, rascunho); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setRascunho(i.texto); setEditando(false); }
          }}
        />
      ) : (
        <span
          role={mexer ? "button" : undefined}
          tabIndex={mexer ? 0 : undefined}
          className={cn("min-w-0 flex-1 break-words", mexer && "cursor-text", i.feito && "text-muted-foreground line-through")}
          onClick={() => { if (mexer) { setRascunho(i.texto); setEditando(true); } }}
          onKeyDown={(e) => { if (mexer && e.key === "Enter") { setRascunho(i.texto); setEditando(true); } }}
        >
          {i.texto}
        </span>
      )}
      {mexer && !editando ? (
        <button type="button" className="opacity-0 group-hover:opacity-100 focus:opacity-100 max-md:opacity-60" aria-label="Remover item" onClick={() => onRemover(i)}>
          <X className="size-3.5 text-muted-foreground" />
        </button>
      ) : null}
    </li>
  );
}
