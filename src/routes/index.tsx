import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Marketing Juff — Painel da equipe" },
    { name: "description", content: "Painel interno de tarefas, comunicação e conteúdo da equipe Juff." },
    { property: "og:title", content: "Marketing Juff — Painel da equipe" },
    { property: "og:description", content: "Painel interno de tarefas, comunicação e conteúdo da equipe Juff." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });

    // Operadores caem em Meu trabalho; admin e gestor caem nos Quadros.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role === "operador") {
      throw redirect({ to: "/tarefas/meu-trabalho" });
    }
    throw redirect({ to: "/tarefas/quadros" });
  },
  component: () => null,
});
