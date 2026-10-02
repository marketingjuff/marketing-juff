import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Chamado pelo banco logo depois que uma notificação nasce.
 * Rota pública, então não confia em quem chama: só envia se a notificação
 * existir, tiver nascido há pouco e ainda não tiver gerado push. A marca de
 * envio é gravada antes do disparo, então cada notificação vira no máximo um push.
 * Nunca devolve dados.
 */
const Corpo = z.object({ notificacao_id: z.string().uuid() });

export const Route = createFileRoute("/api/public/push-enviar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = () => new Response("ok", { status: 200 });
        try {
          const parsed = Corpo.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return new Response("sem id", { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const limite = new Date(Date.now() - 5 * 60_000).toISOString();
          const { data: n } = await supabaseAdmin
            .from("notificacoes")
            .update({ push_enviado_em: new Date().toISOString() })
            .eq("id", parsed.data.notificacao_id)
            .is("push_enviado_em", null)
            .gte("created_at", limite)
            .select("id, user_id, tipo, titulo, detalhe, card_id, quadro_id")
            .maybeSingle();
          if (!n) return ok();

          const { data: inscricoes } = await supabaseAdmin
            .from("push_inscricoes")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", n.user_id);
          if (!inscricoes?.length) return ok();

          const { buildPushPayload } = await import("@block65/webcrypto-web-push");
          const vapid = {
            subject: process.env.VAPID_SUBJECT ?? "mailto:marketing@juff.com.br",
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY,
          };
          const carga = {
            titulo: n.titulo,
            corpo: n.detalhe ?? "",
            tipo: n.tipo,
            card_id: n.card_id,
            quadro_id: n.quadro_id,
          };

          for (const i of inscricoes) {
            try {
              const req = await buildPushPayload(
                { data: carga, options: { ttl: 3600, urgency: "high" } },
                { endpoint: i.endpoint, expirationTime: null, keys: { p256dh: i.p256dh, auth: i.auth } },
                vapid,
              );
              const res = await fetch(i.endpoint, req);
              if (res.ok) {
                await supabaseAdmin
                  .from("push_inscricoes")
                  .update({ ultimo_envio: new Date().toISOString(), falhas: 0 })
                  .eq("id", i.id);
              } else if (res.status === 404 || res.status === 410) {
                await supabaseAdmin.from("push_inscricoes").delete().eq("id", i.id);
              } else {
                console.error(`push recusado [${res.status}]: ${await res.text()}`);
                await supabaseAdmin.rpc("push_marcar_falha", { _id: i.id });
              }
            } catch (erro) {
              console.error("push falhou", erro);
              await supabaseAdmin.rpc("push_marcar_falha", { _id: i.id });
            }
          }
          return ok();
        } catch (erro) {
          console.error("push-enviar", erro);
          return ok();
        }
      },
    },
  },
});
