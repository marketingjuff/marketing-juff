import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import juffLogo from "@/assets/juff-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Marketing Juff" },
      {
        name: "description",
        content: "Acesso restrito ao painel de marketing da Juff. Entre com seu e-mail e senha.",
      },
      { property: "og:title", content: "Entrar — Marketing Juff" },
      {
        property: "og:description",
        content: "Acesso restrito ao painel de marketing da Juff.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    await router.invalidate();
    await router.navigate({ to: "/social/stories" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lift">
        <div className="mb-5 flex items-center gap-2">
          <img src={juffLogo.url} alt="Logotipo Juff" className="size-8 rounded-md object-cover" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">Marketing Juff</h1>
            <p className="text-xs text-muted-foreground">Acesso restrito</p>
          </div>
        </div>

        <form onSubmit={entrar} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            Entrar
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Não existe cadastro aberto. Fale com um administrador para receber sua conta.
        </p>
      </div>
    </div>
  );
}
