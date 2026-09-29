import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, CheckCircle2, GripVertical, Hash, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CardMini } from "./CardMini";
import type { Card, Coluna, Etiqueta, Pessoa } from "@/lib/tarefas";

function CardArrastavel({
  card,
  etiquetas,
  pessoas,
  disabled,
  onAbrir,
}: {
  card: Card;
  etiquetas: Map<string, Etiqueta>;
  pessoas: Map<string, Pessoa>;
  disabled: boolean;
  onAbrir: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", colunaId: card.coluna_id },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
    >
      <CardMini card={card} etiquetas={etiquetas} pessoas={pessoas} onClick={onAbrir} />
    </div>
  );
}

export function ColunaLista({
  coluna,
  cards,
  etiquetas,
  pessoas,
  editable,
  dragDisabled,
  onAbrirCard,
  onAddCard,
  onRenomear,
  onToggleConclui,
  onLimite,
  onArquivar,
}: {
  coluna: Coluna;
  cards: Card[];
  etiquetas: Map<string, Etiqueta>;
  pessoas: Map<string, Pessoa>;
  editable: boolean;
  dragDisabled: boolean;
  onAbrirCard: (id: string) => void;
  onAddCard: (titulo: string) => void;
  onRenomear: (nome: string) => void;
  onToggleConclui: () => void;
  onLimite: () => void;
  onArquivar: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: coluna.id,
    data: { type: "coluna" },
    disabled: !editable || dragDisabled,
  });
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(coluna.nome);
  const [adicionando, setAdicionando] = useState(false);
  const [novo, setNovo] = useState("");
  const estourou = coluna.limite_wip != null && cards.length > coluna.limite_wip;

  function confirmarNome() {
    setEditando(false);
    if (nome.trim() && nome !== coluna.nome) onRenomear(nome.trim());
    else setNome(coluna.nome);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-background/85 p-2 backdrop-blur",
        isDragging && "opacity-40",
      )}
    >
      <div className="mb-2 flex items-center gap-1 px-1">
        {editable && !dragDisabled ? (
          <button
            type="button"
            className="cursor-grab text-muted-foreground"
            aria-label="Arrastar coluna"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        {editando ? (
          <Input
            autoFocus
            value={nome}
            className="h-7 text-sm"
            onChange={(e) => setNome(e.target.value)}
            onBlur={confirmarNome}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmarNome();
              if (e.key === "Escape") {
                setNome(coluna.nome);
                setEditando(false);
              }
            }}
          />
        ) : (
          <h3
            className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-semibold"
            onDoubleClick={() => editable && setEditando(true)}
          >
            {coluna.conclui ? <CheckCircle2 className="size-3.5 shrink-0 text-success" /> : null}
            <span className="truncate">{coluna.nome}</span>
          </h3>
        )}
        <span
          className={cn(
            "rounded-full px-1.5 text-xs tabular-nums",
            estourou ? "bg-destructive text-destructive-foreground" : "text-muted-foreground",
          )}
          title={coluna.limite_wip != null ? `Limite de ${coluna.limite_wip} cards` : undefined}
        >
          {cards.length}
          {coluna.limite_wip != null ? `/${coluna.limite_wip}` : ""}
        </span>
        {editable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Opções da coluna">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditando(true)}>
                <Pencil className="size-4" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleConclui}>
                <CheckCircle2 className="size-4" />
                {coluna.conclui ? "Desmarcar coluna de conclusão" : "Marcar como coluna de conclusão"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLimite}>
                <Hash className="size-4" /> Definir limite de cards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArquivar}>
                <Archive className="size-4" /> Arquivar coluna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-8 flex-1 flex-col gap-2 overflow-y-auto px-0.5 pb-1">
          {cards.map((c) => (
            <CardArrastavel
              key={c.id}
              card={c}
              etiquetas={etiquetas}
              pessoas={pessoas}
              disabled={!editable || dragDisabled}
              onAbrir={() => onAbrirCard(c.id)}
            />
          ))}
        </div>
      </SortableContext>

      {editable ? (
        adicionando ? (
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (novo.trim()) onAddCard(novo.trim());
              setNovo("");
            }}
          >
            <Input
              autoFocus
              value={novo}
              placeholder="Título do card"
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdicionando(false)}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm">Adicionar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdicionando(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 justify-start gap-1 text-muted-foreground"
            onClick={() => setAdicionando(true)}
          >
            <Plus className="size-4" /> Adicionar card
          </Button>
        )
      ) : null}
    </div>
  );
}
