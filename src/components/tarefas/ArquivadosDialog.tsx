import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardDialog } from "./CardDialog";
import {
  ARQUIVADOS_POR_PAGINA,
  PERIODOS_ARQUIVO,
  arquivarCard,
  coresDaEtiqueta,
  listarArquivados,
  mesDoArquivo,
  siglaPessoa,
  type CardArquivado,
  type Etiqueta,
  type PeriodoArquivo,
  type Pessoa,
} from "@/lib/tarefas";

const TODOS = "__todos__";

export function ArquivadosDialog({
  quadroId,
  quadroNome,
  etiquetas,
  pessoas,
  open,
  onOpenChange,
  editable,
  isAdmin,
  meuId,
  role,
}: {
  quadroId: string;
  quadroNome: string;
  etiquetas: Etiqueta[];
  pessoas: Pessoa[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editable: boolean;
  isAdmin: boolean;
  meuId: string;
  role?: string | undefined;
}) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [fResp, setFResp] = useState(TODOS);
  const [fEtiq, setFEtiq] = useState(TODOS);
  const [periodo, setPeriodo] = useState<PeriodoArquivo>("tudo");
  const [aberto, setAberto] = useState<CardArquivado | null>(null);
  const [restaurando, setRestaurando] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const filtro = useMemo(
    () => ({
      quadroId,
      busca: buscaAplicada,
      responsavel: fResp === TODOS ? null : fResp,
      etiqueta: fEtiq === TODOS ? null : fEtiq,
      periodo,
    }),
    [quadroId, buscaAplicada, fResp, fEtiq, periodo],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ["tarefas", "arquivados", filtro],
    queryFn: ({ pageParam }) => listarArquivados(filtro, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (ultima, todas) =>
      (ultima as CardArquivado[]).length < ARQUIVADOS_POR_PAGINA ? undefined : todas.length,
    enabled: open,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const lista = useMemo(() => (data?.pages ?? []).flat() as CardArquivado[], [data]);

  const grupos = useMemo(() => {
    const out: { mes: string; cards: CardArquivado[] }[] = [];
    for (const c of lista) {
      const mes = mesDoArquivo(c.arquivado_em);
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.mes === mes) ultimo.cards.push(c);
      else out.push({ mes, cards: [c] });
    }
    return out;
  }, [lista]);

  const mapaEtiquetas = useMemo(() => new Map(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const mapaPessoas = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas]);

  const observador = useRef<IntersectionObserver | null>(null);
  const sentinela = useCallback(
    (node: HTMLDivElement | null) => {
      observador.current?.disconnect();
      if (!node || !hasNextPage) return;
      observador.current = new IntersectionObserver((entradas) => {
        if (entradas[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      });
      observador.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );
  useEffect(() => () => observador.current?.disconnect(), []);

  const restaurar = async (c: CardArquivado) => {
    setRestaurando(c.id);
    try {
      await arquivarCard(c.id, false);
      toast.success("Card devolvido para o quadro");
      void qc.invalidateQueries({ queryKey: ["tarefas", "arquivados"] });
      void qc.invalidateQueries({ queryKey: ["tarefas", "arquivados-total", quadroId] });
      void qc.invalidateQueries({ queryKey: ["tarefas", "quadro", quadroId] });
      void qc.invalidateQueries({ queryKey: ["tarefas", "quadros"] });
      void qc.invalidateQueries({ queryKey: ["tarefas", "meus"] });
      void qc.invalidateQueries({ queryKey: ["tarefas", "mes"] });
    } catch {
      toast.error("Não deu para devolver o card");
    } finally {
      setRestaurando(null);
    }
  };

  const dataCurta = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[80vh] max-h-[80vh] w-[min(56rem,calc(100vw-2rem))] max-w-none flex-col gap-3 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Archive className="size-4" /> Arquivados de {quadroNome}
            </DialogTitle>
          </DialogHeader>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                placeholder="Buscar por título"
                aria-label="Buscar arquivados por título"
                className="h-8 w-56 pl-7"
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Select value={fResp} onValueChange={setFResp}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos responsáveis</SelectItem>
                {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fEtiq} onValueChange={setFEtiq}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas etiquetas</SelectItem>
                {etiquetas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoArquivo)}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS_ARQUIVO.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : isError ? (
              <p role="alert" className="py-8 text-center text-sm text-destructive">Não deu para carregar os arquivados.</p>
            ) : lista.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum card arquivado com esses filtros.
              </p>
            ) : (
              grupos.map((g) => (
                <div key={g.mes} className="mb-4">
                  <div className="sticky top-0 z-10 flex items-baseline justify-between bg-background py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>{g.mes}</span>
                    <span className="tabular-nums">{g.cards.length} cards</span>
                  </div>
                  <div className="space-y-1">
                    {g.cards.map((c) => {
                      const resp = c.responsavel_id ? mapaPessoas.get(c.responsavel_id) : null;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 hover:bg-accent/40"
                        >
                          <span
                            className="h-6 w-1 shrink-0 rounded-full bg-muted"
                            style={c.cor ? { backgroundColor: c.cor } : undefined}
                          />
                          <Button
                            variant="ghost"
                            onClick={() => setAberto(c)}
                            className="flex h-auto min-w-0 flex-1 justify-start gap-2 overflow-hidden px-0 text-left whitespace-normal"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm">{c.titulo}</span>
                            <span className="hidden shrink-0 items-center gap-1 md:flex">
                              {c.etiquetas.slice(0, 3).map((id) => {
                                const e = mapaEtiquetas.get(id);
                                if (!e) return null;
                                const cs = coresDaEtiqueta(e, mapaPessoas);
                                return (
                                  <span
                                    key={id}
                                    className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                                    style={{ backgroundColor: cs.cor, color: cs.cor_texto }}
                                  >
                                    {e.nome}
                                  </span>
                                );
                              })}
                            </span>
                          </Button>
                          <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:block">
                            {c.coluna_nome}
                          </span>
                          {resp ? (
                            <span
                              className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none",
                                !resp.cor_avatar && "bg-primary text-primary-foreground",
                              )}
                              title={resp.nome}
                              style={
                                resp.cor_avatar
                                  ? { backgroundColor: resp.cor_avatar, color: resp.cor_texto_avatar ?? "var(--primary-foreground)" }
                                  : undefined
                              }
                            >
                              {siglaPessoa(resp)}
                            </span>
                          ) : null}
                          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {dataCurta(c.arquivado_em)}
                          </span>
                          {editable ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 shrink-0"
                              aria-label="Devolver para o quadro"
                              title="Devolver para o quadro"
                              disabled={restaurando === c.id}
                              onClick={() => void restaurar(c)}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            <div ref={sentinela} className="h-6" />
            {isFetchingNextPage ? (
              <p className="pb-2 text-center text-xs text-muted-foreground">Carregando mais...</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <CardDialog
        card={aberto}
        open={!!aberto}
        onOpenChange={(v) => {
          if (!v) {
            setAberto(null);
            void qc.invalidateQueries({ queryKey: ["tarefas", "arquivados"] });
            void qc.invalidateQueries({ queryKey: ["tarefas", "arquivados-total", quadroId] });
          }
        }}
        editable={editable}
        isAdmin={isAdmin}
        meuId={meuId}
        role={role}
      />
    </>
  );
}
