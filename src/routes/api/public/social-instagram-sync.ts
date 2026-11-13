import { createFileRoute } from "@tanstack/react-router";

/**
 * Lê posts e stories do Instagram e guarda em social_publicados.
 * Rota pública: exige a chave social_sync_chave (cabeçalho x-social-chave ou
 * campo "chave" do corpo, usado pelo agendamento). Nunca devolve dados.
 */
const G = "https://graph.facebook.com/v21.0";

type Midia = {
  id: string; caption?: string; media_type?: string; media_url?: string; thumbnail_url?: string;
  permalink?: string; timestamp: string; like_count?: number; comments_count?: number;
};

function dataSP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
async function getJson(url: string): Promise<J> {
  const r = await fetch(url);
  const j = (await r.json().catch(() => ({}))) as J;
  if (!r.ok) throw new Error((j.error as { message?: string })?.message ?? `HTTP ${r.status}`);
  return j;
}

export const Route = createFileRoute("/api/public/social-instagram-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = () => new Response("ok", { status: 200 });
        const corpo = (await request.json().catch(() => ({}))) as { chave?: string };
        const enviada = request.headers.get("x-social-chave") ?? corpo?.chave ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: seg } = await supabaseAdmin
          .from("app_segredos").select("valor").eq("chave", "social_sync_chave").maybeSingle();
        if (!seg?.valor || enviada !== seg.valor) return new Response("sem permissao", { status: 401 });

        try {
          const { data: estado } = await supabaseAdmin
            .from("social_instagram_estado").select("ig_user_id").eq("id", true).maybeSingle();
          const igUser = estado?.ig_user_id?.trim();
          if (!igUser) throw new Error("ID da conta do Instagram não informado");

          const { data: tk } = await supabaseAdmin
            .from("app_segredos").select("valor").eq("chave", "social_ig_token").maybeSingle();
          let token = tk?.valor || process.env["META_IG_TOKEN"] || "";
          if (!token) throw new Error("Token do Instagram não configurado");

          // Renova quando faltar menos de dez dias.
          const appId = process.env["META_APP_ID"]; const appSecret = process.env["META_APP_SECRET"];
          if (appId && appSecret) {
            try {
              const dbg = await getJson(`${G}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${appId}|${appSecret}`);
              const exp = Number((dbg.data as { expires_at?: number })?.expires_at ?? 0);
              if (exp && exp * 1000 - Date.now() < 10 * 86400_000) {
                const novo = await getJson(`${G}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(token)}`);
                if (typeof novo.access_token === "string") {
                  token = novo.access_token;
                  await supabaseAdmin.from("app_segredos")
                    .upsert({ chave: "social_ig_token", valor: token, atualizado_em: new Date().toISOString() });
                }
              }
            } catch { /* renovação falhou, segue com o token atual */ }
          }

          const conta = await getJson(`${G}/${igUser}?fields=username&access_token=${token}`).catch(() => ({}));
          const posts = (await getJson(
            `${G}/${igUser}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${token}`,
          )).data as Midia[] ?? [];
          const stories = ((await getJson(
            `${G}/${igUser}/stories?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${token}`,
          ).catch(() => ({ data: [] }))).data as Midia[]) ?? [];

          const metricas = await Promise.all(stories.map(async (s) => {
            try {
              const j = await getJson(`${G}/${s.id}/insights?metric=views,replies&access_token=${token}`);
              const lista = (j.data as { name: string; values?: { value: number }[] }[]) ?? [];
              const v = (n: string) => Number(lista.find((m) => m.name === n)?.values?.[0]?.value ?? 0);
              return { views: v("views"), replies: v("replies") };
            } catch { return { views: 0, replies: 0 }; }
          }));

          // Capas: só baixa o que ainda não está guardado.
          const todos = [...posts, ...stories];
          const { data: existentes } = await supabaseAdmin
            .from("social_publicados").select("ig_id, capa_path").in("ig_id", todos.map((m) => m.id));
          const comCapa = new Map((existentes ?? []).map((e) => [e.ig_id, e.capa_path]));
          const capas = new Map<string, string>();
          await Promise.all(todos.map(async (m) => {
            const atual = comCapa.get(m.id);
            if (atual) { capas.set(m.id, atual); return; }
            const url = m.thumbnail_url || m.media_url;
            if (!url) return;
            try {
              const r = await fetch(url);
              if (!r.ok) return;
              const caminho = `capas/${m.id}.jpg`;
              const { error } = await supabaseAdmin.storage.from("social")
                .upload(caminho, await r.arrayBuffer(), { upsert: true, contentType: r.headers.get("content-type") ?? "image/jpeg" });
              if (!error) capas.set(m.id, caminho);
            } catch { /* sem capa desta vez */ }
          }));

          const agora = new Date().toISOString();
          const linha = (m: Midia, tipo: "post" | "story", extra: Record<string, number>) => ({
            ig_id: m.id, tipo, formato: m.media_type ?? "", publicado_em: m.timestamp, data: dataSP(m.timestamp),
            legenda: m.caption ?? "", permalink: m.permalink ?? "", capa_path: capas.get(m.id) ?? "",
            atualizado_em: agora, ...extra,
          });
          if (posts.length) {
            const { error } = await supabaseAdmin.from("social_publicados").upsert(
              posts.map((p) => linha(p, "post", { curtidas: p.like_count ?? 0, comentarios: p.comments_count ?? 0 })),
              { onConflict: "ig_id" });
            if (error) throw error;
          }
          if (stories.length) {
            const { error } = await supabaseAdmin.from("social_publicados").upsert(
              stories.map((s, i) => linha(s, "story", { visualizacoes: metricas[i]?.views ?? 0, respostas: metricas[i]?.replies ?? 0 })),
              { onConflict: "ig_id" });
            if (error) throw error;
          }

          await supabaseAdmin.from("social_instagram_estado").update({
            ultima_leitura: agora, ultimo_erro: "",
            ...(typeof (conta as { username?: string }).username === "string" ? { nome_conta: (conta as { username: string }).username } : {}),
          }).eq("id", true);
        } catch (e) {
          const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
          await supabaseAdmin.from("social_instagram_estado").update({ ultimo_erro: msg }).eq("id", true);
        }
        return ok();
      },
    },
  },
});
