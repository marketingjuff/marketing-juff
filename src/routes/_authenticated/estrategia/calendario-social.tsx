import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CalendarioSocial } from "@/components/estrategia/CalendarioSocial";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/estrategia/calendario-social")({
  head: () => ({
    meta: [
      { title: "Calendário social — Marketing Juff" },
      { name: "description", content: "Planejamento e publicações do social da Juff." },
      { property: "og:title", content: "Calendário social — Marketing Juff" },
      { property: "og:description", content: "Planejamento e publicações do social da Juff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarioSocialPage,
});

function CalendarioSocialPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "estrategia.calendario_social");
  const editavel = canEdit(profile, "estrategia.calendario_social");

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem acesso ao Calendário social.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell largura="ampla">
      {!editavel ? (
        <p className="mb-3 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Modo consulta. Você vê o calendário e não altera nada.
        </p>
      ) : null}
      <CalendarioSocial editavel={editavel} />
    </AppShell>
  );
}
