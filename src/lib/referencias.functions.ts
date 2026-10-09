import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Baixa uma imagem de outro site (arrastada do navegador), contornando o bloqueio de CORS.
export const baixarImagemDaWeb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => {
    const u = new URL(String(d?.url ?? ""));
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Endereço inválido");
    return { url: u.toString() };
  })
  .handler(async ({ data }) => {
    const r = await fetch(data.url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" } });
    if (!r.ok) throw new Error("Não foi possível baixar a imagem");
    const tipo = (r.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!tipo.startsWith("image/")) throw new Error("O link não é uma imagem");
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength > 40 * 1024 * 1024) throw new Error("Imagem grande demais");
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { tipo, base64: btoa(bin) };
  });
