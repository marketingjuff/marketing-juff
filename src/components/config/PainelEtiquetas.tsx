import { useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ChevronDown, GripVertical, Pencil, RotateCcw, Tag } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { canEdit, profileQueryOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CORES_ETIQUETA,
  HEX_RE,
  arquivarEtiqueta,
  createEtiqueta,
  etiquetasQueryOptions,
  reordenarEtiquetas,
  updateEtiqueta,
  type Etiqueta,
} from "@/lib/tarefas";

const arquivadasQueryOptions = queryOptions({
  queryKey: ["tarefas", "etiquetas", "arquivadas"],
  queryFn: async (): Promise<Etiqueta[]> => {
    const { data, error } = await supabase
      .from("tarefa_etiquetas")
      .select("id, nome, cor, cor_texto, arquivado, posicao")
      .eq("arquivado", true)
      .order("nome", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

function LinhaEtiqueta({ etiqueta, podeEditar, onChanged }: { etiqueta: Etiqueta; podeEditar: boolean; onChanged: () => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: etiqueta.id });
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(etiqueta.nome);
  const [cor, setCor] = useState(etiqueta.cor);
  const [corTexto, setCorTexto] = useState(etiqueta.cor_texto);
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      onChanged();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (editando) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 w-48" autoFocus />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Fundo <ColorPicker value={cor} onChange={setCor} label="Cor do fundo" presets={CORES_ETIQUETA} />
          Texto <ColorPicker value={corTexto} onChange={setCorTexto} label="Cor do texto" presets={["#ffffff", "#111111", ...CORES_ETIQUETA]} />
        </div>
        <span className="rounded px-2 py-1 text-xs font-medium" style={{ backgroundColor: cor, color: corTexto }}>{nome || "Prévia"}</span>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            disabled={busy || !nome.trim() || !HEX_RE.test(cor)}
            onClick={async () => {
              if (await run(() => updateEtiqueta(etiqueta.id, { nome: nome.trim(), cor, cor_texto: corTexto }), "Etiqueta atualizada"))
                setEditando(false);
            }}
          >
            Salvar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNome(etiqueta.nome);
              setCor(etiqueta.cor);
              setCorTexto(etiqueta.cor_texto);
              setEditando(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5", isDragging && "z-10 opacity-80 shadow-md")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={!podeEditar}
        aria-label="Arrastar para reordenar"
        className={cn("shrink-0 cursor-grab touch-none text-muted-foreground", !podeEditar && "cursor-not-allowed opacity-40")}
      >
        <GripVertical className="size-4" />
      </button>
       <span className="min-w-0 flex-1 truncate rounded px-2 py-1 text-xs font-medium" style={{ backgroundColor: etiqueta.cor, color: etiqueta.cor_texto }}>{etiqueta.nome}</span>
      <Button size="icon" variant="ghost" className="size-7" disabled={!podeEditar} onClick={() => setEditando(true)} aria-label="Editar etiqueta">
        <Pencil className="size-4" />
      </Button>
      <Button size="icon" variant="ghost" className="size-7" disabled={!podeEditar} onClick={() => setConfirmar(true)} aria-label="Arquivar etiqueta">
        <Archive className="size-4" />
      </Button>
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar “{etiqueta.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta sai da lista de escolha e continua marcada nos cards antigos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(() => arquivarEtiqueta(etiqueta.id, true), "Etiqueta arquivada")}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PainelEtiquetas() {
  const qc = useQueryClient();
  const { data: profile = null } = useQuery(profileQueryOptions);
  const podeEditar = canEdit(profile, "tarefas.quadros");
  const { data: ativas = [] } = useQuery(etiquetasQueryOptions);
  const { data: arquivadas = [] } = useQuery(arquivadasQueryOptions);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_ETIQUETA[0]!);
  const [corTexto, setCorTexto] = useState("#ffffff");
  const [salvando, setSalvando] = useState(false);

  const invalidar = () => qc.invalidateQueries({ queryKey: ["tarefas", "etiquetas"] });
  const ordenadas = ativas;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const de = ordenadas.findIndex((e) => e.id === active.id);
    const para = ordenadas.findIndex((e) => e.id === over.id);
    if (de < 0 || para < 0) return;
    const nova = arrayMove(ordenadas, de, para);
    qc.setQueryData(etiquetasQueryOptions.queryKey, nova);
    reordenarEtiquetas(nova.map((e) => e.id)).catch((e) => {
      toast.error((e as Error).message);
      invalidar();
    });
  }

  async function criar() {
    if (!nome.trim() || !HEX_RE.test(cor) || !HEX_RE.test(corTexto)) return;
    setSalvando(true);
    try {
      await createEtiqueta(nome, cor, corTexto);
      toast.success("Etiqueta criada");
      setNome("");
      invalidar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Tag className="size-4 text-primary" /> Etiquetas
      </h2>

      <form
        className="flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void criar();
        }}
      >
        <Input
          value={nome}
          disabled={!podeEditar}
          placeholder="Nome da etiqueta"
          className="h-8 w-48"
          onChange={(e) => setNome(e.target.value)}
        />
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
           Fundo <ColorPicker value={cor} onChange={setCor} disabled={!podeEditar} label="Cor do fundo" presets={CORES_ETIQUETA} />
           Texto <ColorPicker value={corTexto} onChange={setCorTexto} disabled={!podeEditar} label="Cor do texto" presets={["#ffffff", "#111111", ...CORES_ETIQUETA]} />
         </div>
         <span className="rounded px-2 py-1 text-xs font-medium" style={{ backgroundColor: cor, color: corTexto }}>{nome || "Prévia"}</span>
         <Button type="submit" size="sm" disabled={!podeEditar || salvando || !nome.trim() || !HEX_RE.test(cor) || !HEX_RE.test(corTexto)}>
          Criar
        </Button>
      </form>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ordenadas.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {ordenadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma etiqueta cadastrada.</p>
            ) : (
              ordenadas.map((e) => (
                 <LinhaEtiqueta key={`${e.id}-${e.nome}-${e.cor}-${e.cor_texto}`} etiqueta={e} podeEditar={podeEditar} onChanged={invalidar} />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <ChevronDown className="size-4" /> Arquivadas ({arquivadas.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5">
          {arquivadas.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
               <span className="min-w-0 flex-1 truncate rounded px-2 py-1 text-xs font-medium" style={{ backgroundColor: e.cor, color: e.cor_texto }}>{e.nome}</span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={!podeEditar}
                onClick={async () => {
                  try {
                    await arquivarEtiqueta(e.id, false);
                    toast.success("Etiqueta restaurada");
                    invalidar();
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
              >
                <RotateCcw className="size-3.5" /> Restaurar
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
