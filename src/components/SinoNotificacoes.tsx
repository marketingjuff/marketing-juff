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

  const chave = ["notificacoes", "lista"] as const;

  function lerOtimista(id: string) {
    const antes = qc.getQueryData<Notificacao[]>(chave);
    qc.setQueryData<Notificacao[]>(chave, (l) =>
      (l ?? []).map((n) => (n.id === id ? { ...n, lida: true } : n)),
    );
    marcarLida(id).catch(() => {
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
            {lista.map((n) => {
              const Icone = ICONES[n.tipo] ?? Bell;
              const conteudo = (
                <span className="flex w-full items-start gap-2 px-3 py-2 text-left">
                  <Icone className={cn("mt-0.5 size-4 shrink-0", n.lida ? "text-muted-foreground" : "text-primary")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", !n.lida && "font-medium")}>{n.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.detalhe}</span>
                    <span className="block text-[11px] text-muted-foreground">{quandoFoi(n.created_at)}</span>
                  </span>
                </span>
              );

              return (
                <li key={n.id} className={cn(!n.lida && "bg-muted/40")}>
                  {n.quadro_id ? (
                    <Link
                      to="/tarefas/quadros/$quadroId"
                      params={{ quadroId: n.quadro_id }}
                      className="block hover:bg-muted"
                      onClick={() => {
                        lerOtimista(n.id);
                        setAberto(false);
                      }}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <button type="button" className="block w-full hover:bg-muted" onClick={() => lerOtimista(n.id)}>
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
