import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "" }),
  head: () => ({ meta: [{ title: "Conectar ao Marketing Juff" }, { name: "description", content: "Autorize um assistente a ler o Marketing Juff." }, { property: "og:title", content: "Conectar ao Marketing Juff" }, { property: "og:description", content: "Autorização de conector." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">Não foi possível abrir a autorização: {error.message}</div>,
  component: Consent,
});

function Consent() {
  const { authorization_id: id } = Route.useSearch();
  const [det, setDet] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return setErro("Autorização inválida ou expirada.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        window.location.assign(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setEmail(u.user.email ?? null);
      const { data, error } = await oauth().getAuthorizationDetails(id);
      if (error) return setErro(error.message);
      const r = data?.redirect_url ?? data?.redirect_to;
      if (r && !data?.client) return window.location.assign(r);
      setDet(data);
    })();
  }, [id]);

  async function decidir(aprovar: boolean) {
    setOcupado(true);
    const { data, error } = aprovar ? await oauth().approveAuthorization(id) : await oauth().denyAuthorization(id);
    if (error) { setOcupado(false); return setErro(error.message); }
    window.location.assign(data?.redirect_url ?? data?.redirect_to);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        {erro ? <p className="text-sm text-destructive">{erro}</p> : !det ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
          <>
            <h1 className="text-lg font-semibold">Conectar {det.client?.name ?? "assistente"} ao Marketing Juff</h1>
            <p className="text-sm text-muted-foreground">Entrou como {email}. {det.client?.name ?? "O assistente"} poderá ler o sistema como você, vendo só o que você já vê. Suas permissões continuam valendo.</p>
            {det.redirect_uri ? <p className="text-xs text-muted-foreground break-all">Retorno: {det.redirect_uri}</p> : null}
            <div className="flex gap-2">
              <Button disabled={ocupado} onClick={() => decidir(true)}>Autorizar</Button>
              <Button variant="outline" disabled={ocupado} onClick={() => decidir(false)}>Cancelar conexão</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
