import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlarmClock, Bell, CircleAlert, Clock, MessageSquare, Pause, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  marcarLida,
  marcarTodasLidas,
  notificacoesQueryOptions,
  quandoFoi,
  type Notificacao,
  type TipoNotificacao,
} from "@/lib/notificacoes";
import { cn } from "@/lib/utils";

const ICONES: Record<TipoNotificacao, typeof Bell> = {
  card_atribuido: UserPlus,
  comentario: MessageSquare,
  lembrete: Clock,
  vence_amanha: AlarmClock,
  atrasado: CircleAlert,
  parado: Pause,
};

export function SinoNotificacoes() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const { data: lista = [] } = useQuery(notificacoesQueryOptions);
  const naoLidas = lista.filter((n) => !n.lida).length;

  type Linha = { chave: string; n: Notificacao; ids: string[]; quantos: number };
  const linhas: Linha[] = [];
  const porCard = new Map<string, number>();
  for (const n of lista) {
    const agrupavel = n.tipo === "comentario" && !n.lida && !!n.card_id;
    if (!agrupavel) {
      linhas.push({ chave: n.id, n, ids: [n.id], quantos: 1 });
      continue;
    }
    const alvo = porCard.get(n.card_id!);
    if (alvo === undefined) {
      porCard.set(n.card_id!, linhas.length);
      linhas.push({ chave: `c-${n.card_id}`, n, ids: [n.id], quantos: 1 });
    } else {
      const l = linhas[alvo]!;
      l.ids.push(n.id);
      l.quantos += 1;
      if (n.created_at > l.n.created_at) l.n = n;
    }
  }

  const chave = ["notificacoes", "lista"] as const;

  function lerOtimista(ids: string[]) {
    const antes = qc.getQueryData<Notificacao[]>(chave);
    const conjunto = new Set(ids);
    qc.setQueryData<Notificacao[]>(chave, (l) =>
      (l ?? []).map((n) => (conjunto.has(n.id) ? { ...n, lida: true } : n)),
    );
    Promise.all(ids.map((id) => marcarLida(id))).catch(() => {
      qc.setQueryData(chave, antes);
      toast.error("Não deu para marcar como lida");
    });
  }

  function lerTodas() {
    const antes = qc.getQueryData<Notificacao[]>(chave);
    qc.setQueryData<Notificacao[]>(chave, (l) => (l ?? []).map((n) => ({ ...n, lida: true })));
    marcarTodasLidas().catch(() => {
      qc.setQueryData(chave, antes);
      toast.error("Não deu para marcar todas");
    });
  }

  return (
    <DropdownMenu open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative gap-2" aria-label="Notificações">
          <Bell className="size-4" />
          {naoLidas > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notificações</span>
          {naoLidas > 0 ? (
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={lerTodas}>
              Marcar todas como lidas
            </button>
          ) : null}
        </div>

        {lista.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nada por aqui.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {linhas.map((linha) => {
              const n = linha.n;
              const Icone = ICONES[n.tipo] ?? Bell;
              const titulo = linha.quantos > 1 ? `${linha.quantos} comentários novos` : n.titulo;
              const conteudo = (
                <span className="flex w-full items-start gap-2 px-3 py-2 text-left">
                  <Icone className={cn("mt-0.5 size-4 shrink-0", n.lida ? "text-muted-foreground" : "text-primary")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", !n.lida && "font-medium")}>{titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.detalhe}</span>
                    <span className="block text-[11px] text-muted-foreground">{quandoFoi(n.created_at)}</span>
                  </span>
                </span>
              );

              return (
                <li key={linha.chave} className={cn(!n.lida && "bg-muted/40")}>
                  {n.quadro_id ? (
                    <Link
                      to="/tarefas/quadros/$quadroId"
                      params={{ quadroId: n.quadro_id }}
                      className="block hover:bg-muted"
                      onClick={() => {
                        lerOtimista(linha.ids);
                        setAberto(false);
                      }}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <button type="button" className="block w-full hover:bg-muted" onClick={() => lerOtimista(linha.ids)}>
                      {conteudo}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
