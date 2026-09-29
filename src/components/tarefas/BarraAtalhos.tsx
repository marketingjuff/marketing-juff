import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  atalhosQuadrosQueryOptions,
  fixarQuadro,
  fundoCss,
  type AtalhoQuadro,
} from "@/lib/tarefas";

export function BarraAtalhos() {
  const queryClient = useQueryClient();
  const { data } = useQuery(atalhosQuadrosQueryOptions);
  const atalhos = data ?? [];

  if (atalhos.length < 2) return null;

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

  return (
    <ul className="flex items-center gap-1 overflow-x-auto py-1.5">
      {atalhos.map((a) => (
        <li key={a.quadro_id} className="group flex shrink-0 items-center">
          <Link
            to="/tarefas/quadros/$quadroId"
            params={{ quadroId: a.quadro_id }}
            title={a.nome}
            className="flex max-w-[9rem] items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "border-primary bg-primary-soft text-foreground font-medium" }}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: fundoCss(a) }}
            />
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
    </ul>
  );
}
