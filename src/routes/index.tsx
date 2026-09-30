import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
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
