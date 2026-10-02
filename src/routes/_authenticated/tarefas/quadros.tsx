import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronDown, Lock, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NovoQuadroDialog } from "@/components/tarefas/NovoQuadroDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import {
  arquivarQuadro,
  deleteQuadro,
  fundoCss,
  quadrosArquivadosQueryOptions,
  quadrosQueryOptions,
  type Quadro,
} from "@/lib/tarefas";

export const Route = createFileRoute("/_authenticated/tarefas/quadros")({
  head: () => ({
    meta: [
      { title: "Quadros de tarefas — Marketing Juff" },
      { name: "description", content: "Quadros de tarefas da equipe de marketing da Juff." },
      { property: "og:title", content: "Quadros de tarefas — Marketing Juff" },
      { property: "og:description", content: "Quadros de tarefas da equipe de marketing da Juff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuadrosPage,
});

function QuadrosPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "tarefas.quadros");
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: quadros = [], isLoading } = useQuery({ ...quadrosQueryOptions, enabled: pode });
  const { data: arquivados = [] } = useQuery({ ...quadrosArquivadosQueryOptions, enabled: pode });
  const [dialog, setDialog] = useState<{ quadro: Quadro | null; participantes: boolean } | null>(null);
  const [excluir, setExcluir] = useState<Quadro | null>(null);
  const [confirm, setConfirm] = useState("");

  async function rodar(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      qc.invalidateQueries({ queryKey: ["tarefas", "quadros"] });
    }
  }

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem acesso aos quadros.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell largura="ampla">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Quadros</h1>
          {isAdmin ? (
            <Button className="gap-1" onClick={() => setDialog({ quadro: null, participantes: false })}>
              <Plus className="size-4" /> Novo quadro
            </Button>
          ) : null}
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && quadros.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhum quadro ainda.{isAdmin ? " Crie o primeiro em Novo quadro." : ""}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quadros.map((q) => (
            <div
              key={q.id}
              className="group relative h-32 overflow-hidden rounded-xl shadow-soft"
              style={{ background: fundoCss(q) }}
            >
              <Link
                to="/tarefas/quadros/$quadroId"
                params={{ quadroId: q.id }}
                search={{}}
                className="absolute inset-0 flex flex-col justify-between p-3 text-primary-foreground"
              >
                <div>
                  <p className="font-semibold">{q.nome}</p>
                  {q.descricao ? <p className="line-clamp-2 text-xs opacity-85">{q.descricao}</p> : null}
                </div>
                <div className="flex items-center gap-3 text-xs opacity-90">
                  <span>{q.cards_total ?? 0} cards</span>
                  {q.acesso === "restrito" ? (
                    <span title="Quadro restrito" className="flex items-center gap-0.5">
                      <Lock className="size-3" /> {q.membros.length}
                    </span>
                  ) : null}
                </div>
              </Link>
              {isAdmin ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1 size-7 text-primary-foreground hover:bg-background/20"
                      aria-label="Opções do quadro"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDialog({ quadro: q, participantes: false })}>
                      <Pencil className="size-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialog({ quadro: q, participantes: true })}>
                      <Users className="size-4" /> Participantes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => rodar(() => arquivarQuadro(q.id, true), "Quadro arquivado")}>
                      <Archive className="size-4" /> Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setConfirm("");
                        setExcluir(q);
                      }}
                    >
                      <Trash2 className="size-4" /> Excluir de vez
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ))}
        </div>

        {arquivados.length > 0 ? (
          <Collapsible className="rounded-xl border border-border bg-card p-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
              Arquivados ({arquivados.length}) <ChevronDown className="size-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {arquivados.map((q) => (
                <div key={q.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <span className="size-4 rounded" style={{ background: fundoCss(q) }} />
                  <span className="flex-1">{q.nome}</span>
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => rodar(() => arquivarQuadro(q.id, false), "Quadro restaurado")}
                    >
                      <ArchiveRestore className="size-4" /> Restaurar
                    </Button>
                  ) : null}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>

      <NovoQuadroDialog
        open={!!dialog}
        onOpenChange={(v) => !v && setDialog(null)}
        quadro={dialog?.quadro ?? null}
        somenteParticipantes={dialog?.participantes ?? false}
        onSaved={(id) => {
          if (!dialog?.quadro) navigate({ to: "/tarefas/quadros/$quadroId", params: { quadroId: id }, search: {} });
        }}
      />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir quadro de vez</AlertDialogTitle>
            <AlertDialogDescription>
              Colunas, cards, comentários e anexos somem junto. Digite o nome exato para confirmar:{" "}
              <b>{excluir?.nome}</b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!excluir || confirm !== excluir.nome}
              onClick={async () => {
                if (!excluir) return;
                await rodar(() => deleteQuadro(excluir.id), "Quadro excluído");
                setExcluir(null);
              }}
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
