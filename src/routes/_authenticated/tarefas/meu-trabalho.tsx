import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListaCards } from "@/components/tarefas/ListaCards";
import { CardDialog } from "@/components/tarefas/CardDialog";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { isoDe, meusCardsQueryOptions, pessoasQueryOptions, type CardComContexto } from "@/lib/tarefas";

export const Route = createFileRoute("/_authenticated/tarefas/meu-trabalho")({
  head: () => ({
    meta: [
      { title: "Meu trabalho — Marketing Juff" },
      { name: "description", content: "Todos os cards no seu nome, de todos os quadros, por prazo." },
      { property: "og:title", content: "Meu trabalho — Marketing Juff" },
      { property: "og:description", content: "Todos os cards no seu nome, de todos os quadros, por prazo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeuTrabalhoPage,
});

function MeuTrabalhoPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "tarefas.meu_trabalho");
  const gestao = profile?.role === "admin" || profile?.role === "gestor";
  const [pessoa, setPessoa] = useState(profile?.id ?? "");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const { data: pessoas = [] } = useQuery({ ...pessoasQueryOptions, enabled: gestao && pode });
  const { data: cards = [], isLoading } = useQuery({ ...meusCardsQueryOptions(pessoa), enabled: pode && !!pessoa });

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem acesso a Meu trabalho.
        </p>
      </AppShell>
    );
  }

  const lista = cards.filter((c) => mostrarConcluidos || !c.concluido);
  const hoje = isoDe(new Date());
  const fimSemana = new Date();
  fimSemana.setDate(fimSemana.getDate() + (7 - fimSemana.getDay()));
  const fim = isoDe(fimSemana);
  const grupos: { titulo: string; cards: CardComContexto[] }[] = [
    { titulo: "Atrasados", cards: lista.filter((c) => c.data_entrega && c.data_entrega < hoje) },
    { titulo: "Hoje", cards: lista.filter((c) => c.data_entrega === hoje) },
    { titulo: "Esta semana", cards: lista.filter((c) => c.data_entrega && c.data_entrega > hoje && c.data_entrega <= fim) },
    { titulo: "Depois", cards: lista.filter((c) => c.data_entrega && c.data_entrega > fim) },
  ];
  const semData = lista.filter((c) => !c.data_entrega);
  const cardAberto = cards.find((c) => c.id === aberto) ?? null;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Meu trabalho</h1>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {gestao ? (
              <Select value={pessoa} onValueChange={setPessoa}>
                <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : null}
            <label className="flex items-center gap-1.5 text-sm">
              <Switch checked={mostrarConcluidos} onCheckedChange={setMostrarConcluidos} /> Mostrar concluídos
            </label>
          </div>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {grupos.map((g) => (
          <section key={g.titulo} className="space-y-2">
            <h2 className="text-sm font-semibold">
              {g.titulo} <span className="font-normal text-muted-foreground">({g.cards.length})</span>
            </h2>
            <ListaCards cards={g.cards} onAbrir={(c) => setAberto(c.id)} />
          </section>
        ))}
        <Collapsible className="space-y-2">
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-semibold">
            Sem data <span className="font-normal text-muted-foreground">({semData.length})</span>
            <ChevronDown className="size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ListaCards cards={semData} onAbrir={(c) => setAberto(c.id)} />
          </CollapsibleContent>
        </Collapsible>
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
