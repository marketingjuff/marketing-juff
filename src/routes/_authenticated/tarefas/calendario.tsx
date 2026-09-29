import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MesCalendario } from "@/components/tarefas/MesCalendario";
import { CardDialog } from "@/components/tarefas/CardDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { cardsDoMesQueryOptions, pessoasQueryOptions, quadrosQueryOptions } from "@/lib/tarefas";

export const Route = createFileRoute("/_authenticated/tarefas/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário de tarefas — Marketing Juff" },
      { name: "description", content: "Entregas do mês de todos os quadros de tarefas da Juff." },
      { property: "og:title", content: "Calendário de tarefas — Marketing Juff" },
      { property: "og:description", content: "Entregas do mês de todos os quadros de tarefas da Juff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarioPage,
});

const TODOS = "__todos__";

function CalendarioPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "tarefas.calendario");
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth());
  const [fQuadro, setFQuadro] = useState(TODOS);
  const [fResp, setFResp] = useState(TODOS);
  const [aberto, setAberto] = useState<string | null>(null);
  const { data: cards = [] } = useQuery({ ...cardsDoMesQueryOptions(ano, mes), enabled: pode });
  const { data: quadros = [] } = useQuery({ ...quadrosQueryOptions, enabled: pode });
  const { data: pessoas = [] } = useQuery({ ...pessoasQueryOptions, enabled: pode });

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem acesso ao Calendário.
        </p>
      </AppShell>
    );
  }

  const filtrados = cards.filter(
    (c) => (fQuadro === TODOS || c.quadro_id === fQuadro) && (fResp === TODOS || c.responsavel_id === fResp),
  );
  const cardAberto = cards.find((c) => c.id === aberto) ?? null;

  return (
    <AppShell largura="ampla">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Calendário</h1>
          <div className="ml-auto flex gap-2">
            <Select value={fQuadro} onValueChange={setFQuadro}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os quadros</SelectItem>
                {quadros.map((q) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fResp} onValueChange={setFResp}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos responsáveis</SelectItem>
                {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <MesCalendario
          ano={ano}
          mes={mes}
          cards={filtrados}
          onMudarMes={(a, m) => {
            setAno(a);
            setMes(m);
          }}
          onAbrir={(c) => setAberto(c.id)}
        />
      </div>
      <CardDialog
        card={cardAberto}
        open={!!cardAberto}
        onOpenChange={(v) => !v && setAberto(null)}
        editable={canEdit(profile, "tarefas.quadros")}
        isAdmin={profile?.role === "admin"}
        meuId={profile?.id ?? ""}
      />
    </AppShell>
  );
}
