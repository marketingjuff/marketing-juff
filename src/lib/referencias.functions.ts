import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Baixa uma imagem de outro site (arrastada do navegador), contornando o bloqueio de CORS.
export const baixarImagemDaWeb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => {
    const u = new URL(String(d?.url ?? ""));
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Endereço inválido");
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h.endsWith(".local") ||
      h.endsWith(".internal") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(h)
    ) {
      throw new Error("Endereço inválido");
    }
    return { url: u.toString() };
  })
  .handler(async ({ data }) => {
    const origem = new URL(data.url).origin;
    const cabecalhos = (referer: string | null): Record<string, string> => ({
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      ...(referer ? { Referer: referer } : {}),
    });
    // Muitos sites só liberam a imagem quando o pedido parece vir de uma página deles.
    let r = await fetch(data.url, { headers: cabecalhos(origem + "/"), redirect: "follow" });
    if (!r.ok) r = await fetch(data.url, { headers: cabecalhos(null), redirect: "follow" });
    if (!r.ok) throw new Error("Não foi possível baixar a imagem");
    const tipo = (r.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!tipo.startsWith("image/")) throw new Error("O link não é uma imagem");
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength > 40 * 1024 * 1024) throw new Error("Imagem grande demais");
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { tipo, base64: btoa(bin) };
  });
