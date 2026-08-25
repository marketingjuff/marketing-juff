import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { clearMustChangePassword } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/trocar-senha")({
  head: () => ({
    meta: [
      { title: "Trocar senha — Marketing Juff" },
      { name: "description", content: "Defina uma nova senha para sua conta do Marketing Juff." },
      { property: "og:title", content: "Trocar senha — Marketing Juff" },
      {
        property: "og:description",
        content: "Defina uma nova senha para sua conta do Marketing Juff.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrocarSenha,
});

function TrocarSenha() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearFlag = useServerFn(clearMustChangePassword);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setLoading(false);
      setErro(error.message);
      return;
    }
    await clearFlag({ data: undefined });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setLoading(false);
    toast.success("Senha atualizada");
    await router.navigate({ to: "/social/stories" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lift">
        <h1 className="text-lg font-semibold">Defina uma nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Por segurança, a senha inicial precisa ser trocada antes de usar o sistema.
        </p>

        <form onSubmit={salvar} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nova">Nova senha</Label>
            <Input
              id="nova"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirma">Confirme a nova senha</Label>
            <Input
              id="confirma"
              type="password"
              autoComplete="new-password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
            />
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            Salvar senha
          </Button>
        </form>
      </div>
    </div>
  );
}
