import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { SecaoCamiseta, SecaoPaleta } from "@/components/biblioteca/BlocosCores";
import { BotaoZip } from "@/components/biblioteca/BotaoZip";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import { paletaQueryOptions } from "@/lib/biblioteca-marca";
import { coresQueryOptions } from "@/lib/biblioteca";

export const Route = createFileRoute("/_authenticated/biblioteca/cores")({
  head: () => ({
    meta: [
      { title: "Cores — Biblioteca — Marketing Juff" },
      { name: "description", content: "Cartela de camiseta e paleta do manual de marca da Juff." },
      { property: "og:title", content: "Cores — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Cartela de camiseta e paleta do manual de marca da Juff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoresPage,
});

function CoresPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.marca");
  const admin = profile?.role === "admin";
  const { data: paleta = [] } = useQuery({ ...paletaQueryOptions, enabled: pode });
  const { data: coresCamiseta = [] } = useQuery({ ...coresQueryOptions, enabled: pode });

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Você não tem acesso à Biblioteca de marca.</p>
      </AppShell>
    );
  }

  return (
    <AppShell largura="ampla">
      <div className="mb-4 flex justify-end"><BotaoZip origem="cores" /></div>
      <div className="space-y-6">
        <SecaoCamiseta cores={coresCamiseta} />
        <SecaoPaleta paleta={paleta} admin={admin} />
      </div>
    </AppShell>
  );
}
