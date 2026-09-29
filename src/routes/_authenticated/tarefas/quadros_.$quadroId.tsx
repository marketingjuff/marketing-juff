import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuadroBoard } from "@/components/tarefas/QuadroBoard";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { quadroQueryOptions, registrarAberturaQuadro } from "@/lib/tarefas";

export const Route = createFileRoute("/_authenticated/tarefas/quadros_/$quadroId")({
  head: () => ({
    meta: [
      { title: "Quadro — Marketing Juff" },
      { name: "description", content: "Quadro de tarefas com colunas e cards da equipe Juff." },
      { property: "og:title", content: "Quadro — Marketing Juff" },
      { property: "og:description", content: "Quadro de tarefas com colunas e cards da equipe Juff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuadroPage,
});

function QuadroPage() {
  const { quadroId } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "tarefas.quadros");
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ ...quadroQueryOptions(quadroId), enabled: pode });
  const queryClient = useQueryClient();
  const jaContou = useRef<string | null>(null);

  useEffect(() => {
    if (!pode || isLoading || !data || jaContou.current === quadroId) return;
    jaContou.current = quadroId;
    void registrarAberturaQuadro(quadroId).then(() => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", "atalhos"] });
    });
  }, [pode, isLoading, data, quadroId, queryClient]);

  useEffect(() => {
    if (!pode || (!isLoading && (data === null || error))) {
      toast.error("Você não tem acesso a este quadro");
      navigate({ to: "/tarefas/quadros" });
    }
  }, [pode, isLoading, data, error, navigate]);

  return (
    <AppShell largura="ampla">
      {data ? (
        <QuadroBoard
          dados={data}
          editable={canEdit(profile, "tarefas.quadros")}
          isAdmin={profile?.role === "admin"}
          meuId={profile?.id ?? ""}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}
    </AppShell>
  );
}
