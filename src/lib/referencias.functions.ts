import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

function enderecoSeguro(bruto: string) {
  const u = new URL(bruto);
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
  return u;
}

// Procura a imagem principal de uma página (quando arrastam um link em vez da foto).
function imagemDaPagina(html: string, base: string): string | null {
  const padroes = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const p of padroes) {
    const m = html.match(p);
    if (m?.[1]) {
      try {
        return new URL(m[1].replace(/&amp;/g, "&"), base).toString();
      } catch {
        /* tenta o próximo */
      }
    }
  }
  return null;
}

async function tentar(url: string, referer: string | null) {
  return fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      Accept: "image/avif,image/webp,image/apng,image/*,text/html;q=0.5,*/*;q=0.3",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
      ...(referer ? { Referer: referer } : {}),
    },
  });
}

// Baixa uma imagem de outro site (arrastada do navegador), contornando o bloqueio de CORS.
export const baixarImagemDaWeb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string; pagina?: string | null }) => {
    const u = enderecoSeguro(String(d?.url ?? ""));
    let pagina: string | null = null;
    try {
      if (d?.pagina) pagina = enderecoSeguro(d.pagina).toString();
    } catch {
      pagina = null;
    }
    return { url: u.toString(), pagina };
  })
  .handler(async ({ data }) => {
    let alvo = data.url;
    let ultimoMotivo = "";
    for (let passo = 0; passo < 2; passo++) {
      const origem = new URL(alvo).origin + "/";
      const referers = [data.pagina, origem, null].filter((v, i, a) => a.indexOf(v) === i);
      let r: Response | null = null;
      for (const ref of referers) {
        try {
          r = await tentar(alvo, ref);
        } catch (e) {
          ultimoMotivo = "o site não respondeu";
          console.error("[baixarImagemDaWeb] falha de rede", alvo, e);
          r = null;
          continue;
        }
        if (r.ok) break;
        ultimoMotivo = `o site respondeu ${r.status}`;
        console.error("[baixarImagemDaWeb] status", r.status, alvo, "referer:", ref);
      }
      if (!r || !r.ok) return { ok: false as const, motivo: ultimoMotivo || "o site bloqueou" };

      const tipo = (r.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
      if (tipo.startsWith("image/")) {
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf.byteLength > 40 * 1024 * 1024) return { ok: false as const, motivo: "a imagem é grande demais" };
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return { ok: true as const, tipo, base64: btoa(bin) };
      }
      if (tipo.includes("html") && passo === 0) {
        const html = (await r.text()).slice(0, 500_000);
        const achada = imagemDaPagina(html, r.url || alvo);
        if (achada) {
          try {
            alvo = enderecoSeguro(achada).toString();
            continue;
          } catch {
            /* cai no erro abaixo */
          }
        }
        console.error("[baixarImagemDaWeb] página sem imagem principal", alvo);
        return { ok: false as const, motivo: "o link é de uma página, não de uma imagem" };
      }
      console.error("[baixarImagemDaWeb] tipo inesperado", tipo, alvo);
      return { ok: false as const, motivo: "o link não é uma imagem" };
    }
    return { ok: false as const, motivo: "não encontrei a imagem" };
  });
