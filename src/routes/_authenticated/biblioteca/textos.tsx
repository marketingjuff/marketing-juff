import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { SecaoTextos } from "@/components/biblioteca/BlocosTextos";
import { BotaoZip } from "@/components/biblioteca/BotaoZip";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { textosQueryOptions } from "@/lib/biblioteca-marca";

export const Route = createFileRoute("/_authenticated/biblioteca/textos")({
  head: () => ({
    meta: [
      { title: "Textos — Biblioteca — Marketing Juff" },
      { name: "description", content: "Frases, chamadas e textos prontos da Juff." },
      { property: "og:title", content: "Textos — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Frases, chamadas e textos prontos da Juff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TextosPage,
});

function TextosPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.marca");
  const podeEditar = canEdit(profile, "biblioteca.marca");
  const admin = profile?.role === "admin" && podeEditar;
  const { data: textos = [] } = useQuery({ ...textosQueryOptions, enabled: pode });

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Você não tem acesso à Biblioteca de marca.</p>
      </AppShell>
    );
  }

  return (
    <AppShell largura="ampla">
        {!podeEditar ? (
          <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Você está em modo de consulta. Pode ver, copiar e baixar, mas não alterar.
          </p>
        ) : null}
      <div className="mb-4 flex justify-end"><BotaoZip origem="textos" /></div>
      <SecaoTextos textos={textos} admin={admin} />
    </AppShell>
  );
}
