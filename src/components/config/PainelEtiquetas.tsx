import { useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ChevronDown, GripVertical, Pencil, Plus, RotateCcw, Tag } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars


  HEX_RE,
  arquivarEtiqueta,
  coresDaEtiqueta,
  corSugerida,
  pessoasQueryOptions,
  type Pessoa,
  createEtiqueta,
  etiquetasQueryOptions,
  quadrosQueryOptions,
  reordenarEtiquetas,
  updateEtiqueta,
  type Etiqueta,
} from "@/lib/tarefas";
import { usePresetsMarca } from "@/hooks/use-presets-marca";

const arquivadasQueryOptions = queryOptions({
  queryKey: ["tarefas", "etiquetas", "arquivadas"],
  queryFn: async (): Promise<Etiqueta[]> => {
    const { data, error } = await supabase
      .from("tarefa_etiquetas")
      .select("id, nome, cor, cor_texto, arquivado, posicao, quadro_id, pessoa_id")
      .eq("arquivado", true)
      .order("nome", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

function LinhaEtiqueta({ etiqueta, quadros, pessoas, podeEditar, onChanged }: { etiqueta: Etiqueta; quadros: { id: string; nome: string }[]; pessoas: Pessoa[]; podeEditar: boolean; onChanged: () => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: etiqueta.id });
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(etiqueta.nome);
  const [cor, setCor] = useState(etiqueta.cor);
  const [corTexto, setCorTexto] = useState(etiqueta.cor_texto);
  const [quadroId, setQuadroId] = useState<string | null>(etiqueta.quadro_id);
  const [pessoaId, setPessoaId] = useState<string | null>(etiqueta.pessoa_id);
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);
  const presetsMarca = usePresetsMarca();

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
        <Input value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} className="h-8 w-48" autoFocus />
        <Select value={quadroId ?? "global"} onValueChange={(v) => { setQuadroId(v === "global" ? null : v); if (v === "global") setPessoaId(null); }}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global</SelectItem>
            {quadros.map((q) => (
              <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {quadroId ? (
          <Select value={pessoaId ?? "ninguem"} onValueChange={(v) => setPessoaId(v === "ninguem" ? null : v)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguem">De ninguém</SelectItem>
              {pessoas.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome || "Sem nome"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Fundo <ColorPicker value={cor} onChange={setCor} disabled={!!pessoaId} label="Cor do fundo" presets={presetsMarca} />
          Texto <ColorPicker value={corTexto} onChange={setCorTexto} disabled={!!pessoaId} label="Cor do texto" presets={["#ffffff", "#111111", ...presetsMarca]} />
        </div>
        <span className="rounded px-2 py-1 font-nunito text-[13px] font-medium" style={(() => { const cs = coresDaEtiqueta({ cor, cor_texto: corTexto, pessoa_id: pessoaId }, pessoas); return { backgroundColor: cs.cor, color: cs.cor_texto }; })()}>{nome || "Prévia"}</span>
        {pessoaId ? (
          <span className="w-full text-[11px] text-muted-foreground">
            Cor travada na cor da pessoa. Troque na ficha dela em Usuários e permissões.
          </span>
        ) : null}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            disabled={busy || !nome.trim() || !HEX_RE.test(cor)}
            onClick={async () => {
              if (await run(() => updateEtiqueta(etiqueta.id, { nome: nome.trim().toUpperCase(), cor, cor_texto: corTexto, quadro_id: quadroId, pessoa_id: quadroId ? pessoaId : null }), "Etiqueta atualizada"))
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
              setQuadroId(etiqueta.quadro_id);
              setPessoaId(etiqueta.pessoa_id);
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
       <span className="min-w-0 flex-1 truncate rounded px-2 py-1 font-nunito text-[13px] font-medium" style={(() => { const cs = coresDaEtiqueta(etiqueta, pessoas); return { backgroundColor: cs.cor, color: cs.cor_texto }; })()}>{etiqueta.nome}</span>
      {etiqueta.pessoa_id ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {pessoas.find((p) => p.id === etiqueta.pessoa_id)?.nome ?? "pessoa removida"}
        </span>
      ) : null}
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

function GrupoSoltavel({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-10 space-y-1.5 rounded-lg p-1 transition-colors ${isOver ? "bg-primary/10 ring-1 ring-primary/40" : ""}`}
    >
      {children}
    </div>
  );
}

export function PainelEtiquetas() {
  const qc = useQueryClient();
  const { data: profile = null } = useQuery(profileQueryOptions);
  const podeEditar = canEdit(profile, "tarefas.quadros");
  const { data: ativas = [] } = useQuery(etiquetasQueryOptions);
  const { data: arquivadas = [] } = useQuery(arquivadasQueryOptions);
  const { data: quadros = [] } = useQuery(quadrosQueryOptions);
  const { data: pessoas = [] } = useQuery(pessoasQueryOptions);
  const [pessoaNova, setPessoaNova] = useState<string | null>(null);
  const [grupoNovo, setGrupoNovo] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_ETIQUETA[0]!);
  const [corTexto, setCorTexto] = useState("#ffffff");
  const [salvando, setSalvando] = useState(false);
  const presetsMarca = usePresetsMarca();

  const invalidar = () => qc.invalidateQueries({ queryKey: ["tarefas", "etiquetas"] });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const grupos = [
    { id: null as string | null, nome: "Globais", itens: ativas.filter((e) => e.quadro_id === null) },
    ...quadros.map((q) => ({ id: q.id as string | null, nome: q.nome, itens: ativas.filter((e) => e.quadro_id === q.id) })),
  ];

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const arrastada = ativas.find((e) => e.id === active.id);
    if (!arrastada) return;
    const overId = String(over.id);
    const alvo = ativas.find((e) => e.id === overId);
    let destino: string | null;
    if (alvo) destino = alvo.quadro_id ?? null;
    else if (overId.startsWith("grupo:")) destino = overId === "grupo:global" ? null : overId.slice(6);
    else return;
    const origem = arrastada.quadro_id ?? null;

    if (origem === destino) {
      if (!alvo) return;
      const doGrupo = ativas.filter((e) => (e.quadro_id ?? null) === origem);
      const de = doGrupo.findIndex((e) => e.id === active.id);
      const para = doGrupo.findIndex((e) => e.id === over.id);
      if (de < 0 || para < 0) return;
      const fila = arrayMove(doGrupo, de, para).map((e) => e.id);
      const atualizada = ativas
        .map((e) => {
          if ((e.quadro_id ?? null) !== origem) return e;
          const idx = fila.indexOf(e.id);
          return idx >= 0 ? { ...e, posicao: idx + 1 } : e;
        })
        .sort((x, y) => x.posicao - y.posicao);
      qc.setQueryData(etiquetasQueryOptions.queryKey, atualizada);
      reordenarEtiquetas(fila).catch((e) => {
        toast.error((e as Error).message);
        invalidar();
      });
      return;
    }

    // Mudança de grupo (entre quadros / global)
    const destinoItens = ativas.filter((e) => (e.quadro_id ?? null) === destino);
    const idxAlvo = alvo ? destinoItens.findIndex((e) => e.id === alvo.id) : destinoItens.length;
    const fila = destinoItens.map((e) => e.id);
    fila.splice(idxAlvo < 0 ? fila.length : idxAlvo, 0, arrastada.id);
    const pessoa = destino === null ? null : arrastada.pessoa_id;
    const atualizada = ativas
      .map((e) => {
        if (e.id === arrastada.id) return { ...e, quadro_id: destino, pessoa_id: pessoa, posicao: fila.indexOf(e.id) + 1 };
        if ((e.quadro_id ?? null) !== destino) return e;
        return { ...e, posicao: fila.indexOf(e.id) + 1 };
      })
      .sort((x, y) => x.posicao - y.posicao);
    qc.setQueryData(etiquetasQueryOptions.queryKey, atualizada);
    updateEtiqueta(arrastada.id, { quadro_id: destino, pessoa_id: pessoa })
      .then(() => reordenarEtiquetas(fila))
      .then(() => {
        toast.success("Etiqueta movida");
        invalidar();
      })
      .catch((e) => {
        toast.error((e as Error).message);
        invalidar();
      });
  }

  async function criar(emQuadro: string | null = grupoNovo) {
    if (!nome.trim() || !HEX_RE.test(cor) || !HEX_RE.test(corTexto)) return;
    setSalvando(true);
    try {
      await createEtiqueta(nome, cor, corTexto, emQuadro, emQuadro ? pessoaNova : null);
      toast.success("Etiqueta criada");
      setNome("");
      setPessoaNova(null);
      setCor(corSugerida([...ativas, { ...(ativas[0] ?? {}), cor, quadro_id: emQuadro } as Etiqueta], emQuadro));
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
          id="campo-nome-etiqueta"
          onChange={(e) => setNome(e.target.value.toUpperCase())}
        />
        <Select
          value={grupoNovo ?? "global"}
          onValueChange={(v) => {
            const alvo = v === "global" ? null : v;
            setGrupoNovo(alvo);
            if (alvo === null) setPessoaNova(null);
            setCor(corSugerida(ativas, alvo));
          }}
        >
          <SelectTrigger className="h-8 w-44 text-xs" disabled={!podeEditar}>
            <SelectValue placeholder="Onde vale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global, todos os quadros</SelectItem>
            {quadros.map((q) => (
              <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {grupoNovo ? (
          <Select value={pessoaNova ?? "ninguem"} onValueChange={(v) => setPessoaNova(v === "ninguem" ? null : v)}>
            <SelectTrigger className="h-8 w-44 text-xs" disabled={!podeEditar}>
              <SelectValue placeholder="De quem é" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguem">De ninguém</SelectItem>
              {pessoas.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome || "Sem nome"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
           Fundo <ColorPicker value={cor} onChange={setCor} disabled={!podeEditar || !!pessoaNova} label="Cor do fundo" presets={presetsMarca} />
           Texto <ColorPicker value={corTexto} onChange={setCorTexto} disabled={!podeEditar || !!pessoaNova} label="Cor do texto" presets={["#ffffff", "#111111", ...presetsMarca]} />
         </div>
         <span className="rounded px-2 py-1 font-nunito text-[13px] font-medium" style={(() => { const cs = coresDaEtiqueta({ cor, cor_texto: corTexto, pessoa_id: grupoNovo ? pessoaNova : null }, pessoas); return { backgroundColor: cs.cor, color: cs.cor_texto }; })()}>{nome || "Prévia"}</span>
         <Button type="submit" size="sm" disabled={!podeEditar || salvando || !nome.trim() || !HEX_RE.test(cor) || !HEX_RE.test(corTexto)}>
          Criar
        </Button>
        {pessoaNova ? (
          <p className="w-full text-[11px] text-muted-foreground">
            Esta etiqueta vai usar a cor da pessoa, definida na ficha dela em Usuários e permissões.
          </p>
        ) : null}
      </form>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.id ?? "global"} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">
                  {g.nome}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{g.itens.length}</span>
                </h3>
                {g.id === null ? <span className="text-[11px] text-muted-foreground">valem em qualquer quadro</span> : null}
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-auto size-7"
                  disabled={!podeEditar}
                  aria-label={`Criar etiqueta em ${g.nome}`}
                  onClick={() => {
                    setGrupoNovo(g.id);
                    setPessoaNova(null);
                    setCor(corSugerida(ativas, g.id));
                    document.getElementById("campo-nome-etiqueta")?.focus();
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <SortableContext items={g.itens.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <GrupoSoltavel id={`grupo:${g.id ?? "global"}`}>
                  {g.itens.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma etiqueta neste grupo. Arraste uma etiqueta para cá.</p>
                  ) : (
                    g.itens.map((e) => (
                      <LinhaEtiqueta
                        key={`${e.id}-${e.nome}-${e.cor}-${e.cor_texto}-${e.quadro_id ?? "g"}-${e.pessoa_id ?? "n"}`}
                        etiqueta={e}
                        quadros={quadros}
                        pessoas={pessoas}
                        podeEditar={podeEditar}
                        onChanged={invalidar}
                      />
                    ))
                  )}
                </GrupoSoltavel>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <ChevronDown className="size-4" /> Arquivadas ({arquivadas.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5">
          {arquivadas.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
               <span className="min-w-0 flex-1 truncate rounded px-2 py-1 font-nunito text-[13px] font-medium" style={(() => { const cs = coresDaEtiqueta(e, pessoas); return { backgroundColor: cs.cor, color: cs.cor_texto }; })()}>{e.nome}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {e.quadro_id ? (quadros.find((q) => q.id === e.quadro_id)?.nome ?? "quadro removido") : "Global"}
              </span>
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
