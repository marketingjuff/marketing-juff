import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  atalhosQuadrosQueryOptions,
  fixarQuadro,
  fundoCss,
  type AtalhoQuadro,
} from "@/lib/tarefas";
import {
  MIME_ATALHO,
  atalhosPaginasQueryOptions,
  criarAtalhoPagina,
  excluirAtalhoPagina,
  type AtalhoPagina,
} from "@/lib/atalhos-paginas";

const CHAVE_PAG = ["atalhos-paginas"];

export function BarraAtalhos() {
  const queryClient = useQueryClient();
  const { data } = useQuery(atalhosQuadrosQueryOptions);
  const { data: paginas = [] } = useQuery(atalhosPaginasQueryOptions);
  const atalhos = data ?? [];
  const [arrastando, setArrastando] = useState(false);
  const [sobre, setSobre] = useState(false);

  useEffect(() => {
    const ini = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes(MIME_ATALHO)) setArrastando(true);
    };
    const fim = () => { setArrastando(false); setSobre(false); };
    document.addEventListener("dragstart", ini);
    document.addEventListener("dragend", fim);
    document.addEventListener("drop", fim);
    return () => {
      document.removeEventListener("dragstart", ini);
      document.removeEventListener("dragend", fim);
      document.removeEventListener("drop", fim);
    };
  }, []);

  const mostrar = arrastando || paginas.length > 0 || atalhos.length >= 2;
  if (!mostrar) return null;

  async function alternar(atalho: AtalhoQuadro) {
    const anterior = queryClient.getQueryData<AtalhoQuadro[]>(["tarefas", "atalhos"]);
    queryClient.setQueryData<AtalhoQuadro[]>(["tarefas", "atalhos"], (atual) =>
      (atual ?? []).map((a) =>
        a.quadro_id === atalho.quadro_id ? { ...a, fixado: !a.fixado } : a,
      ),
    );
    try {
      await fixarQuadro(atalho.quadro_id, !atalho.fixado);
      queryClient.invalidateQueries({ queryKey: ["tarefas", "atalhos"] });
    } catch (error) {
      if (anterior) queryClient.setQueryData(["tarefas", "atalhos"], anterior);
      toast.error((error as Error).message);
    }
  }

  function soltar(e: React.DragEvent) {
    e.preventDefault();
    setSobre(false);
    setArrastando(false);
    const bruto = e.dataTransfer.getData(MIME_ATALHO);
    if (!bruto) return;
    const { destino, label } = JSON.parse(bruto) as { destino: string; label: string };
    if (paginas.some((p) => p.destino === destino)) return;
    const anterior = queryClient.getQueryData<AtalhoPagina[]>(CHAVE_PAG);
    const posicao = paginas.length;
    queryClient.setQueryData<AtalhoPagina[]>(CHAVE_PAG, [
      ...(anterior ?? []),
      { id: `tmp-${destino}`, destino, label, posicao },
    ]);
    criarAtalhoPagina(destino, label, posicao)
      .then(() => void queryClient.invalidateQueries({ queryKey: CHAVE_PAG }))
      .catch(() => {
        queryClient.setQueryData(CHAVE_PAG, anterior);
        toast.error("Não deu para criar o atalho");
      });
  }

  function remover(p: AtalhoPagina) {
    const anterior = queryClient.getQueryData<AtalhoPagina[]>(CHAVE_PAG);
    queryClient.setQueryData<AtalhoPagina[]>(CHAVE_PAG, (anterior ?? []).filter((x) => x.id !== p.id));
    excluirAtalhoPagina(p.id).catch(() => {
      queryClient.setQueryData(CHAVE_PAG, anterior);
      toast.error("Não deu para remover");
    });
  }

  const chip =
    "flex max-w-[9rem] items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

  return (
    <ul
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(MIME_ATALHO)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={soltar}
      className={cn(
        "flex min-h-8 items-center gap-1 overflow-x-auto rounded-md py-1.5 transition-colors",
        arrastando && "outline-dashed outline-1 outline-primary",
        sobre && "bg-primary-soft",
      )}
    >
      {paginas.map((p) => (
        <li key={p.id} className="group flex shrink-0 items-center">
          <Link
            to={p.destino}
            title={p.label}
            className={chip}
            activeProps={{ className: "border-primary bg-primary-soft text-foreground font-medium" }}
          >
            <span className="truncate">{p.label}</span>
          </Link>
          <button
            type="button"
            onClick={() => remover(p)}
            aria-label={`Remover ${p.label}`}
            title="Remover da barra"
            className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
      {atalhos.length >= 2 &&
        atalhos.map((a) => (
          <li key={a.quadro_id} className="group flex shrink-0 items-center">
            <Link
              to="/tarefas/quadros/$quadroId"
              params={{ quadroId: a.quadro_id }}
              title={a.nome}
              className={chip}
              activeProps={{ className: "border-primary bg-primary-soft text-foreground font-medium" }}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: fundoCss(a) }} />
              <span className="truncate">{a.nome}</span>
            </Link>
            <button
              type="button"
              onClick={() => alternar(a)}
              aria-label={a.fixado ? `Soltar ${a.nome}` : `Fixar ${a.nome}`}
              title={a.fixado ? "Soltar da barra" : "Fixar na barra"}
              className={cn(
                "ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-opacity hover:text-foreground",
                a.fixado ? "opacity-100 text-foreground" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
              )}
            >
              {a.fixado ? <Pin className="size-3" /> : <PinOff className="size-3" />}
            </button>
          </li>
        ))}
      {arrastando ? (
        <li className="shrink-0 px-2 text-xs text-muted-foreground">Solte aqui para criar um atalho</li>
      ) : null}
    </ul>
  );
}
