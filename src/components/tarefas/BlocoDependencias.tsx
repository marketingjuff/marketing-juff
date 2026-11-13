import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Link2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  buscarCardsParaVincular,
  criarDependencia,
  dependenciasQueryOptions,
  dependenciasPendentesQueryOptions,
  excluirDependencia,
  type CardVinculado,
} from "@/lib/tarefas";

function LinhaVinculo({
  item,
  podeTirar,
  onAbrir,
  onTirar,
}: {
  item: CardVinculado;
  podeTirar: boolean;
  onAbrir: () => void;
  onTirar?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      {item.concluido ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-success" />
      ) : (
        <Circle className="size-3.5 shrink-0 text-destructive" />
      )}
      <button
        type="button"
        onClick={onAbrir}
        className="min-w-0 flex-1 text-left"
        title="Abrir este card"
      >
        <span className={cn("block truncate text-[14px] leading-tight", item.concluido && "line-through opacity-70")}>
          {item.titulo || "Sem título"}
        </span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">
          {item.quadro_nome}
          {item.coluna_nome ? ` › ${item.coluna_nome}` : ""}
        </span>
      </button>
      {podeTirar && onTirar ? (
        <Button
          size="sm"
          variant="ghost"
          className="size-6 shrink-0 p-0 text-muted-foreground"
          title="Tirar esta dependência"
          aria-label="Tirar esta dependência"
          onClick={onTirar}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export function BlocoDependencias({
  cardId,
  quadroId,
  mexer,
  textoAntigo,
  onLimparTextoAntigo,
  onAbrirCard,
}: {
  cardId: string;
  quadroId: string;
  mexer: boolean;
  textoAntigo: string;
  onLimparTextoAntigo: () => void;
  onAbrirCard: (quadroId: string, cardId: string) => void;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({ ...dependenciasQueryOptions(cardId), enabled: !!cardId });
  const depende = data?.depende ?? [];
  const bloqueia = data?.bloqueia ?? [];

  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<CardVinculado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTermo("");
    setResultados([]);
  }, [cardId]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (termo.trim().length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    timer.current = setTimeout(async () => {
      try {
        const achados = await buscarCardsParaVincular(termo, cardId);
        const jaTem = new Set(depende.map((d) => d.id));
        setResultados(achados.filter((a) => !jaTem.has(a.id)));
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [termo, cardId, depende.length]);

  function atualizar(outroQuadroId?: string) {
    void qc.invalidateQueries({ queryKey: ["tarefas", "dependencias", cardId] });
    void qc.invalidateQueries({ queryKey: dependenciasPendentesQueryOptions(quadroId).queryKey });
    if (outroQuadroId && outroQuadroId !== quadroId) {
      void qc.invalidateQueries({ queryKey: dependenciasPendentesQueryOptions(outroQuadroId).queryKey });
    }
  }

  async function adicionar(alvo: CardVinculado) {
    setTermo("");
    setResultados([]);
    try {
      await criarDependencia(cardId, alvo.id);
      void qc.invalidateQueries({ queryKey: ["tarefas", "dependencias", alvo.id] });
      atualizar(alvo.quadro_id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function tirar(alvo: CardVinculado) {
    try {
      await excluirDependencia(cardId, alvo.id);
      void qc.invalidateQueries({ queryKey: ["tarefas", "dependencias", alvo.id] });
      atualizar(alvo.quadro_id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const travados = depende.filter((d) => !d.concluido).length;

  return (
    <div className="space-y-2" id="bloco-dependencias">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          <Link2 className="size-4" /> Dependências
        </Label>
        {travados > 0 ? (
          <span className="text-[12px] font-medium text-destructive">
            {travados} {travados === 1 ? "pendência" : "pendências"}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Depende de</p>
        {depende.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nenhum card trava este.</p>
        ) : (
          <div className="space-y-1">
            {depende.map((d) => (
              <LinhaVinculo
                key={d.id}
                item={d}
                podeTirar={mexer}
                onAbrir={() => onAbrirCard(d.quadro_id, d.id)}
                onTirar={() => tirar(d)}
              />
            ))}
          </div>
        )}
        {mexer ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-7"
              value={termo}
              placeholder="Buscar card pelo título"
              onChange={(e) => setTermo(e.target.value)}
            />
            {termo.trim().length >= 2 ? (
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                {buscando ? (
                  <p className="px-2 py-1.5 text-[13px] text-muted-foreground">Procurando</p>
                ) : resultados.length === 0 ? (
                  <p className="px-2 py-1.5 text-[13px] text-muted-foreground">Nenhum card encontrado</p>
                ) : (
                  resultados.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="block w-full rounded px-2 py-1.5 text-left hover:bg-accent"
                      onClick={() => adicionar(r)}
                    >
                      <span className="block truncate text-[14px] leading-tight">{r.titulo || "Sem título"}</span>
                      <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                        {r.quadro_nome}
                        {r.coluna_nome ? ` › ${r.coluna_nome}` : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {bloqueia.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Bloqueia</p>
          <div className="space-y-1">
            {bloqueia.map((b) => (
              <LinhaVinculo
                key={b.id}
                item={b}
                podeTirar={false}
                onAbrir={() => onAbrirCard(b.quadro_id, b.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {textoAntigo.trim() ? (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-border px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Anotação antiga</p>
            <p className="break-words text-[13px]">{textoAntigo}</p>
          </div>
          {mexer ? (
            <Button size="sm" variant="ghost" className="h-6 shrink-0 px-2 text-[11px]" onClick={onLimparTextoAntigo}>
              Limpar
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
