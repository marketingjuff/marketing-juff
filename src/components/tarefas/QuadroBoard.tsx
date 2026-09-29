import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Lock, Palette, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColunaLista } from "./ColunaLista";
import { CardMini } from "./CardMini";
import { CardDialog } from "./CardDialog";
import { FundoPicker } from "./FundoPicker";
import { NovoQuadroDialog } from "./NovoQuadroDialog";
import { ReorganizarCardsDialog } from "./ReorganizarCardsDialog";
import {
  arquivarColuna,
  createCard,
  createColuna,
  estaAtrasado,
  etiquetasQueryOptions,
  fundoCss,
  moverCard,
  ordenarCards,
  pessoasQueryOptions,
  registrarHistorico,
  reorderCards,
  reorderColunas,
  type CriterioOrdem,
  updateColuna,
  updateQuadro,
  type Card,
  type Coluna,
  podeEstruturar,
  podeMexerNoCard,
  type QuadroCompleto,
} from "@/lib/tarefas";

const TODOS = "__todos__";

export function QuadroBoard({
  dados,
  editable,
  isAdmin,
  meuId,
  role,
}: {
  dados: QuadroCompleto;
  editable: boolean;
  isAdmin: boolean;
  meuId: string;
  role?: string | undefined;
}) {
  const qc = useQueryClient();
  const estruturar = podeEstruturar(role, editable);
  const { quadro } = dados;
  const { data: etiquetasLista = [] } = useQuery(etiquetasQueryOptions);
  const { data: pessoasLista = [] } = useQuery(pessoasQueryOptions);
  const etiquetas = useMemo(() => new Map(etiquetasLista.map((e) => [e.id, e])), [etiquetasLista]);
  const pessoas = useMemo(() => new Map(pessoasLista.map((p) => [p.id, p])), [pessoasLista]);

  const [colunas, setColunas] = useState<Coluna[]>(dados.colunas);
  const [cards, setCards] = useState<Card[]>(dados.cards);
  const [ativo, setAtivo] = useState<{ type: "card" | "coluna"; id: string } | null>(null);
  const [colunaOrigem, setColunaOrigem] = useState<string | null>(null);
  const [salvandoArraste, setSalvandoArraste] = useState(false);
  const antesDoArraste = useRef<{ colunas: Coluna[]; cards: Card[] } | null>(null);
  useEffect(() => {
    if (!ativo && !salvandoArraste) {
      setColunas(dados.colunas);
      setCards(dados.cards);
    }
  }, [dados, ativo, salvandoArraste]);

  const [busca, setBusca] = useState("");
  const [fResp, setFResp] = useState(TODOS);
  const [fEtiq, setFEtiq] = useState(TODOS);
  const [soAtrasados, setSoAtrasados] = useState(false);
  const filtrando = !!busca.trim() || fResp !== TODOS || fEtiq !== TODOS || soAtrasados;
  const [cardAberto, setCardAberto] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState(false);
  const [novaColuna, setNovaColuna] = useState("");
  const [reorganizando, setReorganizando] = useState<string | null>(null);

  const invalidar = () => qc.invalidateQueries({ queryKey: ["tarefas", "quadro", quadro.id] });
  const atualRef = useRef({ colunas, cards });
  atualRef.current = { colunas, cards };

  async function reorganizarColuna(colId: string, criterio: CriterioOrdem, dec: boolean) {
    const daColuna = cards.filter((c) => c.coluna_id === colId && !c.arquivado);
    const anterior = [...daColuna].sort((a, b) => a.posicao - b.posicao).map((c) => c.id);
    const nova = ordenarCards(daColuna, criterio, dec, pessoas, etiquetas);
    const aplicar = (ids: string[]) =>
      setCards((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, posicao: ids.indexOf(c.id) } : c)));
    aplicar(nova);
    setSalvandoArraste(true);
    try {
      await reorderCards(colId, nova);
      toast.success("Cards reorganizados", {
        duration: 10_000,
        action: {
          label: "Desfazer",
          onClick: () => {
            aplicar(anterior);
            void rodar(() => reorderCards(colId, anterior));
          },
        },
      });
    } catch (e) {
      aplicar(anterior);
      toast.error((e as Error).message);
    } finally {
      setSalvandoArraste(false);
      await invalidar();
    }
  }
  async function rodar(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      void invalidar();
    }
  }

  const visiveis = (colId: string) =>
    cards
      .filter((c) => c.coluna_id === colId)
      .sort((a, b) => a.posicao - b.posicao)
      .filter((c) => {
        if (busca.trim() && !c.titulo.toLowerCase().includes(busca.trim().toLowerCase())) return false;
        if (fResp !== TODOS && c.responsavel_id !== fResp) return false;
        if (fEtiq !== TODOS && !c.etiquetas.includes(fEtiq)) return false;
        if (soAtrasados && !estaAtrasado(c)) return false;
        return true;
      });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const colisao: CollisionDetection = (args) => {
    const tipo = args.active.data.current?.["type"];
    if (tipo === "coluna") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((d) => d.data.current?.["type"] === "coluna"),
      });
    }
    const cardsAlvo = args.droppableContainers.filter((d) => d.data.current?.["type"] === "card");
    const noCard = pointerWithin({ ...args, droppableContainers: cardsAlvo });
    if (noCard.length) return noCard;
    const colsAlvo = args.droppableContainers.filter((d) => d.data.current?.["type"] === "coluna");
    const naColuna = pointerWithin({ ...args, droppableContainers: colsAlvo });
    if (naColuna.length) return naColuna;
    return closestCorners({ ...args, droppableContainers: cardsAlvo.concat(colsAlvo) });
  };

  function colunaDe(id: string): string | null {
    if (colunas.some((c) => c.id === id)) return id;
    return cards.find((c) => c.id === id)?.coluna_id ?? null;
  }

  function onStart(e: DragStartEvent) {
    const type = e.active.data.current?.["type"] as "card" | "coluna";
    antesDoArraste.current = { colunas, cards };
    setAtivo({ type, id: String(e.active.id) });
    if (type === "card") setColunaOrigem(colunaDe(String(e.active.id)));
  }

  function cancelarArraste() {
    const anterior = antesDoArraste.current;
    if (anterior) {
      setColunas(anterior.colunas);
      setCards(anterior.cards);
    }
    antesDoArraste.current = null;
    setColunaOrigem(null);
    setAtivo(null);
  }

  async function salvarArraste(fn: () => Promise<void>) {
    setSalvandoArraste(true);
    try {
      await fn();
      // Confirma no cache o estado local já exibido, para não piscar enquanto a recarga roda atrás.
      qc.setQueryData(["tarefas", "quadro", quadro.id], (old: QuadroCompleto | null | undefined) =>
        old ? { ...old, colunas: atualRef.current.colunas, cards: atualRef.current.cards } : old,
      );
      void invalidar();
      antesDoArraste.current = null;
    } catch (e) {
      const anterior = antesDoArraste.current;
      if (anterior) {
        setColunas(anterior.colunas);
        setCards(anterior.cards);
      }
      toast.error((e as Error).message);
      void invalidar();
    } finally {
      setColunaOrigem(null);
      setSalvandoArraste(false);
    }
  }

  function onOver(e: DragOverEvent) {
    if (ativo?.type !== "card" || !e.over) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);
    const destino = colunaDe(overId);
    const atual = colunaDe(activeId);
    if (!destino || !atual || destino === atual) return;
    setCards((prev) => {
      const naDestino = prev.filter((c) => c.coluna_id === destino).sort((a, b) => a.posicao - b.posicao);
      const idx = naDestino.findIndex((c) => c.id === overId);
      const pos = idx === -1 ? naDestino.length : idx;
      const ids = naDestino.map((c) => c.id);
      ids.splice(pos, 0, activeId);
      return prev.map((c) => {
        if (c.id === activeId) return { ...c, coluna_id: destino, posicao: ids.indexOf(activeId) };
        const i = ids.indexOf(c.id);
        return i >= 0 ? { ...c, posicao: i } : c;
      });
    });
  }

  function onEnd(e: DragEndEvent) {
    const a = ativo;
    if (!a || !e.over) {
      cancelarArraste();
      return;
    }
    const overId = String(e.over.id);

    if (a.type === "coluna") {
      const de = colunas.findIndex((c) => c.id === a.id);
      const para = colunas.findIndex((c) => c.id === overId);
      if (de < 0 || para < 0 || de === para) {
        cancelarArraste();
        return;
      }
      const nova = arrayMove(colunas, de, para);
      setColunas(nova);
      setAtivo(null);
      void salvarArraste(() => reorderColunas(quadro.id, nova.map((c) => c.id)));
      return;
    }

    const colId = colunaDe(a.id);
    if (!colId) {
      cancelarArraste();
      return;
    }
    let ordem = cards
      .filter((c) => c.coluna_id === colId)
      .sort((x, y) => x.posicao - y.posicao)
      .map((c) => c.id);
    const de = ordem.indexOf(a.id);
    const para = ordem.indexOf(overId);
    if (de >= 0 && para >= 0 && de !== para) ordem = arrayMove(ordem, de, para);
    const idx = ordem.indexOf(a.id);
    setCards((prev) =>
      prev.map((c) => (ordem.includes(c.id) ? { ...c, posicao: ordem.indexOf(c.id) } : c)),
    );
    const origem = colunaOrigem;
    setAtivo(null);
    const restantesOrigem =
      origem && origem !== colId
        ? cards
            .filter((c) => c.coluna_id === origem && c.id !== a.id && !c.arquivado)
            .sort((x, y) => x.posicao - y.posicao)
            .map((c) => c.id)
        : [];
    void salvarArraste(async () => {
      await moverCard(a.id, colId, idx);
      if (origem && origem !== colId) {
        await reorderCards(origem, restantesOrigem);
        const n = (id: string) => colunas.find((c) => c.id === id)?.nome ?? "";
        void registrarHistorico(a.id, "Moveu", `${n(origem)} → ${n(colId)}`);
      }
    });
  }

  const cardDialog = cards.find((c) => c.id === cardAberto) ?? null;
  const cardArrastado = ativo?.type === "card" ? cards.find((c) => c.id === ativo.id) : null;
  const colunaArrastada = ativo?.type === "coluna" ? colunas.find((c) => c.id === ativo.id) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          {quadro.nome}
          {quadro.membros.length > 0 ? (
            <span className="flex items-center gap-0.5 text-xs font-normal text-muted-foreground">
              <Lock className="size-3" /> {quadro.membros.length}
            </span>
          ) : null}
        </h1>
        <span className="text-sm text-muted-foreground">{cards.length} cards</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {estruturar ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Palette className="size-4" /> Fundo
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <FundoPicker
                    value={{
                      fundo_tipo: quadro.fundo_tipo,
                      fundo_cor1: quadro.fundo_cor1,
                      fundo_cor2: quadro.fundo_cor2,
                    }}
                    onChange={(v) => rodar(() => updateQuadro(quadro.id, v))}
                  />
                </PopoverContent>
              </Popover>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setParticipantes(true)}>
                <Users className="size-4" /> Participantes
              </Button>
            </>
          ) : null}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              placeholder="Buscar card"
              className="h-8 w-44 pl-7"
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={fResp} onValueChange={setFResp}>
            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos responsáveis</SelectItem>
              {pessoasLista.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fEtiq} onValueChange={setFEtiq}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas etiquetas</SelectItem>
              {etiquetasLista.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-sm">
            <Switch checked={soAtrasados} onCheckedChange={setSoAtrasados} /> Só atrasados
          </label>
        </div>
      </div>

      <div
        className="min-h-[70vh] overflow-x-auto rounded-2xl p-3"
        style={{ background: fundoCss(quadro) }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={colisao}
          onDragStart={onStart}
          onDragOver={onOver}
          onDragEnd={onEnd}
          onDragCancel={cancelarArraste}
        >
          <div className="flex items-start gap-3">
            <SortableContext items={colunas.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {colunas.map((col) => (
                <ColunaLista
                  key={col.id}
                  coluna={col}
                  cards={visiveis(col.id)}
                  etiquetas={etiquetas}
                  pessoas={pessoas}
                  editable={editable}
                  estruturar={estruturar}
                  podeArrastarCard={(c) => podeMexerNoCard(c, role, meuId, editable)}
                  dragDisabled={filtrando}
                  onAbrirCard={setCardAberto}
                  onAddCard={(t) => rodar(() => createCard(quadro.id, col.id, t))}
                  onRenomear={(nome) => rodar(() => updateColuna(col.id, { nome }))}
                  onToggleConclui={() => rodar(() => updateColuna(col.id, { conclui: !col.conclui }))}
                  onLimite={() => {
                    const v = window.prompt(
                      "Limite de cards nesta coluna (deixe vazio para sem limite)",
                      col.limite_wip?.toString() ?? "",
                    );
                    if (v === null) return;
                    const n = v.trim() === "" ? null : Math.max(0, parseInt(v, 10) || 0);
                    rodar(() => updateColuna(col.id, { limite_wip: n }));
                  }}
                  onArquivar={() => rodar(() => arquivarColuna(col.id, true))}
                  totalCards={cards.filter((c) => c.coluna_id === col.id).length}
                  onReorganizar={() => setReorganizando(col.id)}
                />
              ))}
            </SortableContext>

            {estruturar ? (
              <form
                className="w-64 shrink-0 space-y-2 rounded-xl bg-background/60 p-2 backdrop-blur"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!novaColuna.trim()) return;
                  const n = novaColuna;
                  setNovaColuna("");
                  rodar(() => createColuna(quadro.id, n));
                }}
              >
                <Input
                  value={novaColuna}
                  placeholder="Nome da nova coluna"
                  className="h-8 bg-background"
                  onChange={(e) => setNovaColuna(e.target.value)}
                />
                <Button type="submit" size="sm" className="w-full gap-1">
                  <Plus className="size-4" /> Adicionar coluna
                </Button>
              </form>
            ) : null}
            {colunas.length === 0 && !editable ? (
              <p className="rounded-lg bg-background/85 p-3 text-sm text-muted-foreground">
                Este quadro ainda não tem colunas.
              </p>
            ) : null}
          </div>

          <DragOverlay dropAnimation={null}>
            {cardArrastado ? (
              <div className="w-68">
                <CardMini card={cardArrastado} etiquetas={etiquetas} pessoas={pessoas} arrastando />
              </div>
            ) : colunaArrastada ? (
              <div className="w-72 rounded-xl bg-background/90 p-3 text-sm font-semibold shadow-lg">
                {colunaArrastada.nome}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CardDialog
        card={cardDialog}
        open={!!cardDialog}
        onOpenChange={(v) => !v && setCardAberto(null)}
        editable={editable}
        isAdmin={isAdmin}
        meuId={meuId}
        role={role}
      />
      <ReorganizarCardsDialog
        open={!!reorganizando}
        onOpenChange={(v) => !v && setReorganizando(null)}
        colunaNome={colunas.find((c) => c.id === reorganizando)?.nome ?? ""}
        onAplicar={(criterio, dec) => reorganizarColuna(reorganizando!, criterio, dec)}
      />
      <NovoQuadroDialog
        open={participantes}
        onOpenChange={setParticipantes}
        quadro={quadro}
        somenteParticipantes
      />
    </div>
  );
}
