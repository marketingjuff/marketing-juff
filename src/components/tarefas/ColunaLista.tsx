import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ArrowDownAZ, CheckCircle2, GripVertical, Hash, MoreHorizontal, Pencil, Plus, UserCheck } from "lucide-react";
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
import { REGRAS_RESPONSAVEL, type Card, type Coluna, type Etiqueta, type Pessoa } from "@/lib/tarefas";

function CardArrastavel({
  card,
  etiquetas,
  pessoas,
  disabled,
  onAbrir,
  exigeResponsavel,
}: {
  card: Card;
  etiquetas: Map<string, Etiqueta>;
  pessoas: Map<string, Pessoa>;
  disabled: boolean;
  onAbrir: () => void;
  exigeResponsavel: boolean;
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
      <CardMini card={card} etiquetas={etiquetas} pessoas={pessoas} onClick={onAbrir} exigeResponsavel={exigeResponsavel} />
    </div>
  );
}

export function ColunaLista({
  coluna,
  cards,
  etiquetas,
  pessoas,
  editable,
  estruturar,
  podeArrastarCard,
  dragDisabled,
  onAbrirCard,
  onAddCard,
  onRenomear,
  onToggleConclui,
  onLimite,
  onArquivar,
  totalCards,
  onReorganizar,
  onResponsavelAoEntrar,
  exigeResponsavel = false,
}: {
  coluna: Coluna;
  cards: Card[];
  etiquetas: Map<string, Etiqueta>;
  pessoas: Map<string, Pessoa>;
  editable: boolean;
  estruturar: boolean;
  podeArrastarCard: (c: Card) => boolean;
  dragDisabled: boolean;
  onAbrirCard: (id: string) => void;
  onAddCard: (titulo: string) => void;
  onRenomear: (nome: string) => void;
  onToggleConclui: () => void;
  onLimite: () => void;
  onArquivar: () => void;
  totalCards: number;
  onReorganizar: () => void;
  onResponsavelAoEntrar: () => void;
  exigeResponsavel?: boolean;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: coluna.id,
    data: { type: "coluna" },
    disabled: !estruturar || dragDisabled,
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
        {estruturar && !dragDisabled ? (
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
            onDoubleClick={() => estruturar && setEditando(true)}
          >
            {coluna.conclui ? <CheckCircle2 className="size-3.5 shrink-0 text-success" /> : null}
            <span className="truncate">{coluna.nome}</span>
            {coluna.resp_ao_entrar && coluna.resp_ao_entrar !== "padrao" ? (
              <span
                className="shrink-0 text-muted-foreground"
                title={REGRAS_RESPONSAVEL.find((r) => r.valor === coluna.resp_ao_entrar)?.rotulo ?? ""}
              >
                <UserCheck className="size-3.5" />
              </span>
            ) : null}
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
        {estruturar ? (
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
              {totalCards >= 2 ? (
                <DropdownMenuItem disabled={dragDisabled} onClick={onReorganizar}>
                  <ArrowDownAZ className="size-4" />
                  {dragDisabled ? "Limpe os filtros para reorganizar" : "Reorganizar cards"}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onToggleConclui}>
                <CheckCircle2 className="size-4" />
                {coluna.conclui ? "Desmarcar coluna de conclusão" : "Marcar como coluna de conclusão"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLimite}>
                <Hash className="size-4" /> Definir limite de cards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResponsavelAoEntrar}>
                <UserCheck className="size-4" /> Responsável ao entrar
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
              disabled={!podeArrastarCard(c) || dragDisabled}
              exigeResponsavel={exigeResponsavel}
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
