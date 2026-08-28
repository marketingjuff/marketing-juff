import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AlinhamentoTexto, Frame, Story } from "@/lib/stories";

export const LOGOS_BUCKET = "logos";

/** Cores oficiais da marca, atalho nos seletores de cor. */
export const CORES_MARCA: { nome: string; hex: string }[] = [
  { nome: "Branco puro", hex: "#ffffff" },
  { nome: "Amarelo", hex: "#ffe938" },
  { nome: "Amarelo Flúor", hex: "#e0ff00" },
  { nome: "Areia", hex: "#d6d1c9" },
  { nome: "Azul Índigo", hex: "#4d6694" },
  { nome: "Bordô", hex: "#551b2a" },
  { nome: "Cinza Chumbo", hex: "#353439" },
  { nome: "Cinza Claro", hex: "#585858" },
  { nome: "Fúcsia", hex: "#870065" },
  { nome: "Laranja", hex: "#e36837" },
  { nome: "Laranja Ultra", hex: "#fd5f2f" },
  { nome: "Marinho", hex: "#1d2546" },
  { nome: "Marrom", hex: "#342423" },
  { nome: "Menta", hex: "#93a393" },
  { nome: "Pink", hex: "#b7357a" },
  { nome: "Preto", hex: "#212120" },
  { nome: "Roial", hex: "#323db8" },
  { nome: "Rosa Flúor", hex: "#f51eb1" },
  { nome: "Rosa Pop", hex: "#e0418e" },
  { nome: "Roxo", hex: "#8354b5" },
  { nome: "Roxo Ultra", hex: "#533189" },
  { nome: "Turquesa", hex: "#1581ae" },
  { nome: "Verde Água", hex: "#a1e1d9" },
  { nome: "Verde Bandeira", hex: "#2e572d" },
  { nome: "Verde Militar", hex: "#2a352a" },
  { nome: "Vermelho", hex: "#c12b3d" },
  { nome: "Branco", hex: "#f6f6fb" },
];

/** Formato e qualidade da arte exportada. JPEG mantém o arquivo no tamanho do original. */
export const EXPORT_MIME = "image/jpeg";
export const EXPORT_QUALIDADE = 0.92;
export const EXPORT_EXTENSAO = ".jpg";

export const FONTES = ["Nunito", "Google Sans Flex"] as const;
export const PESOS = [
  { value: 400, label: "Normal" },
  { value: 700, label: "Negrito" },
  { value: 900, label: "Black" },
] as const;

export const GRID_COLUNAS = 10;
export const GRID_LINHAS = 16;

/** Gruda a posição no centro da célula mais próxima da grade 10 x 16. */
export function grudarNaGrade(xPct: number, yPct: number): { x: number; y: number } {
  const col = Math.min(GRID_COLUNAS - 1, Math.max(0, Math.round((xPct / 100) * GRID_COLUNAS - 0.5)));
  const lin = Math.min(GRID_LINHAS - 1, Math.max(0, Math.round((yPct / 100) * GRID_LINHAS - 0.5)));
  return {
    x: ((col + 0.5) / GRID_COLUNAS) * 100,
    y: ((lin + 0.5) / GRID_LINHAS) * 100,
  };
}

/** Pontos da grade, em percentual, para o guia visual. */
export const PONTOS_GRADE: { x: number; y: number }[] = Array.from(
  { length: GRID_COLUNAS * GRID_LINHAS },
  (_, i) => ({
    x: (((i % GRID_COLUNAS) + 0.5) / GRID_COLUNAS) * 100,
    y: ((Math.floor(i / GRID_COLUNAS) + 0.5) / GRID_LINHAS) * 100,
  }),
);

/** Tamanho real da fonte em função da altura da imagem. */
export function tamanhoFontePx(alturaPx: number, tamanho: number): number {
  return alturaPx * (0.018 + tamanho * 0.008);
}

/** Fração máxima da largura da imagem que o logo pode ocupar. */
export const LOGO_LARGURA_MAXIMA = 0.85;

/**
 * Dimensões do logo calculadas pela altura da imagem, com a largura derivada
 * da proporção do SVG. Nunca deforma e nunca passa de 85% da largura.
 */
export function dimensoesLogo(
  larguraImagem: number,
  alturaImagem: number,
  tamanho: number,
  proporcao: number,
): { largura: number; altura: number } {
  const prop = proporcao > 0 ? proporcao : 1;
  let altura = alturaImagem * (0.02 + tamanho * 0.008);
  let largura = altura * prop;
  const limite = larguraImagem * LOGO_LARGURA_MAXIMA;
  if (largura > limite) {
    const fator = limite / largura;
    largura = limite;
    altura = altura * fator;
  }
  return { largura, altura };
}

/** Normaliza para hexadecimal minúsculo de seis dígitos. Devolve null se inválido. */
export function normalizarHex(valor: string): string | null {
  const limpo = valor.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(limpo)) {
    return `#${limpo
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(limpo)) return `#${limpo.toLowerCase()}`;
  return null;
}

export function corComOpacidade(hex: string, opacidade: number): string {
  const limpo = hex.replace("#", "");
  const completo =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;
  const r = parseInt(completo.slice(0, 2), 16) || 0;
  const g = parseInt(completo.slice(2, 4), 16) || 0;
  const b = parseInt(completo.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, opacidade)) / 100})`;
}

/* ---------------- pré-formatações ---------------- */

export type Preset = {
  id: string;
  nome: string;
  fonte: string;
  peso: number;
  tamanho: number;
  alinhamento: AlinhamentoTexto;
  cor_texto: string;
  cor_sombra: string;
  opacidade_sombra: number;
};

export const presetsQueryOptions = queryOptions({
  queryKey: ["story-text-presets"],
  queryFn: async (): Promise<Preset[]> => {
    const { data, error } = await supabase
      .from("story_text_presets")
      .select("id, nome, fonte, peso, tamanho, alinhamento, cor_texto, cor_sombra, opacidade_sombra")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Preset[];
  },
});

export async function criarPreset(preset: Omit<Preset, "id">): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("story_text_presets")
    .insert({ ...preset, created_by: userData.user?.id ?? null });
  if (error) throw error;
}

export async function excluirPreset(id: string): Promise<void> {
  const { error } = await supabase.from("story_text_presets").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- biblioteca de logos ---------------- */

export type LogoAsset = {
  id: string;
  nome: string;
  file_path: string;
  proporcao: number;
  url: string;
  svg: string;
};

/** Proporção largura/altura lida do viewBox (ou de width/height). */
export function proporcaoDoSvg(svg: string): number {
  const viewBox = /viewBox\s*=\s*"([^"]+)"/i.exec(svg)?.[1];
  if (viewBox) {
    const partes = viewBox.trim().split(/[\s,]+/).map(Number);
    if (partes.length === 4 && partes[2]! > 0 && partes[3]! > 0) return partes[2]! / partes[3]!;
  }
  const w = Number(/\bwidth\s*=\s*"([\d.]+)/i.exec(svg)?.[1]);
  const h = Number(/\bheight\s*=\s*"([\d.]+)/i.exec(svg)?.[1]);
  if (w > 0 && h > 0) return w / h;
  return 1;
}

/** Troca o preenchimento do SVG pela cor escolhida. */
export function svgColorido(svg: string, cor: string): string {
  let out = svg
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/fill\s*=\s*"(?!none)[^"]*"/gi, `fill="${cor}"`);
  out = out.replace(/fill\s*:\s*(?!none)[^;"'}]+/gi, `fill:${cor}`);
  if (!/<svg[^>]*\sfill\s*=/i.test(out)) out = out.replace(/<svg\b/i, `<svg fill="${cor}"`);
  if (!/xmlns\s*=/i.test(out)) {
    out = out.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return out.trim();
}

/** Aplica largura e altura explícitas, para rasterizar em alta resolução. */
function svgDimensionado(svg: string, largura: number, altura: number): string {
  return svg
    .replace(/\s(width|height)\s*=\s*"[^"]*"/gi, "")
    .replace(/<svg\b/i, `<svg width="${Math.round(largura)}" height="${Math.round(altura)}"`);
}

export const logosQueryOptions = queryOptions({
  queryKey: ["story-logos"],
  queryFn: async (): Promise<LogoAsset[]> => {
    const { data, error } = await supabase
      .from("story_logos")
      .select("id, nome, file_path, proporcao")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const linhas = data ?? [];
    if (linhas.length === 0) return [];

    const { data: assinadas } = await supabase.storage
      .from(LOGOS_BUCKET)
      .createSignedUrls(
        linhas.map((l) => l.file_path),
        3600,
      );
    const urls = new Map<string, string>();
    for (const item of assinadas ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }

    return Promise.all(
      linhas.map(async (l) => {
        const url = urls.get(l.file_path) ?? "";
        let svg = "";
        try {
          if (url) svg = await (await fetch(url)).text();
        } catch {
          svg = "";
        }
        return {
          id: l.id,
          nome: l.nome,
          file_path: l.file_path,
          proporcao: Number(l.proporcao) || (svg ? proporcaoDoSvg(svg) : 1),
          url,
          svg,
        };
      }),
    );
  },
});

export async function enviarLogo(file: File, nome: string): Promise<void> {
  const ehSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (!ehSvg) throw new Error("A biblioteca aceita apenas arquivos SVG.");
  const texto = await file.text();
  const proporcao = proporcaoDoSvg(texto);
  const path = `${crypto.randomUUID()}.svg`;
  const { error: upErro } = await supabase.storage
    .from(LOGOS_BUCKET)
    .upload(path, file, { contentType: "image/svg+xml" });
  if (upErro) throw upErro;
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("story_logos").insert({
    nome: nome.trim() || file.name.replace(/\.svg$/i, ""),
    file_path: path,
    proporcao,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw error;
}

/** Remove o logo da biblioteca. O arquivo permanece no bucket. */
export async function excluirLogo(id: string): Promise<void> {
  const { error } = await supabase.from("story_logos").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- exportação da arte montada ---------------- */

async function carregarImagemOriginal(url: string): Promise<HTMLImageElement> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao baixar a imagem (HTTP ${resp.status})`);
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao ler a imagem"));
      img.src = objectUrl;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }
}

async function carregarSvgComoImagem(svg: string): Promise<HTMLImageElement> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao ler o logo"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export async function garantirFontes(
  comp: { texto_peso: number; texto_fonte: string },
  tamanhoPx: number,
): Promise<void> {
  try {
    await document.fonts.load(`${comp.texto_peso} ${Math.round(tamanhoPx)}px "${comp.texto_fonte}"`);
    await document.fonts.ready;
  } catch {
    /* segue sem travar a exportação */
  }
}

/**
 * Quebra o texto igual ao preview: respeita as quebras manuais e, dentro de
 * cada trecho, quebra por palavra medindo até caber na largura máxima.
 */
function quebrarLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMax: number,
): string[] {
  const saida: string[] = [];
  for (const parte of texto.split("\n")) {
    const palavras = parte.split(/\s+/).filter((p) => p.length > 0);
    if (palavras.length === 0) {
      saida.push("");
      continue;
    }
    let linha = palavras[0] as string;
    for (const palavra of palavras.slice(1)) {
      const tentativa = `${linha} ${palavra}`;
      if (ctx.measureText(tentativa).width <= larguraMax) {
        linha = tentativa;
      } else {
        saida.push(linha);
        linha = palavra;
      }
    }
    saida.push(linha);
  }
  return saida;
}

/** Desenha a arte com texto e logo na resolução original e devolve um JPEG. */
export async function montarArteExport(frame: Frame, logoSvg: string | null): Promise<Blob> {
  const img = await carregarImagemOriginal(frame.url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a exportação");

  // JPEG não tem transparência. O fundo branco evita área preta caso a imagem
  // de origem tenha canal alfa.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const c = frame.comp;

  if (c.logo_ativo && logoSvg) {
    const proporcao = proporcaoDoSvg(logoSvg) || 1;
    const { largura, altura } = dimensoesLogo(
      canvas.width,
      canvas.height,
      c.logo_tamanho,
      proporcao,
    );
    const svg = svgDimensionado(svgColorido(logoSvg, c.logo_cor), largura * 2, altura * 2);
    const logoImg = await carregarSvgComoImagem(svg);
    const cx = (c.logo_x / 100) * canvas.width;
    const cy = (c.logo_y / 100) * canvas.height;
    ctx.drawImage(logoImg, cx - largura / 2, cy - altura / 2, largura, altura);
  }

  const texto = (frame.texto_principal ?? "").replace(/\r/g, "");
  if (texto.trim().length > 0) {
    const fs = tamanhoFontePx(canvas.height, c.texto_tamanho);
    await garantirFontes(c, fs);
    ctx.font = `${c.texto_peso} ${fs}px "${c.texto_fonte}", sans-serif`;
    ctx.textAlign = c.texto_alinhamento;
    ctx.textBaseline = "middle";
    ctx.fillStyle = c.texto_cor;
    if (c.sombra_opacidade > 0) {
      ctx.shadowColor = corComOpacidade(c.sombra_cor, c.sombra_opacidade);
      ctx.shadowOffsetX = fs * 0.08;
      ctx.shadowOffsetY = fs * 0.08;
      ctx.shadowBlur = fs * 0.28;
    }
    const linhas = quebrarLinhas(ctx, texto, canvas.width * (c.texto_largura / 100));
    const alturaLinha = fs * 1.2;
    const cx = (c.texto_x / 100) * canvas.width;
    const cy = (c.texto_y / 100) * canvas.height;
    const inicio = cy - ((linhas.length - 1) * alturaLinha) / 2;
    linhas.forEach((linha, i) => ctx.fillText(linha, cx, inicio + i * alturaLinha));
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem"))),
      EXPORT_MIME,
      EXPORT_QUALIDADE,
    );
  });
}

function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function nomeLimpo(nome: string): string {
  const base = (nome || "arte")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "");
  return base || "arte";
}

export async function exportarArteMontada(frame: Frame, logoSvg: string | null): Promise<void> {
  const blob = await montarArteExport(frame, logoSvg);
  baixar(blob, `${nomeLimpo(frame.nome_arquivo)}${EXPORT_EXTENSAO}`);
}

/** Exporta em zip todas as artes aprovadas do bloco, na ordem da sequência. */
export async function exportarBlocoMontado(
  story: Story,
  svgPorLogo: (logoId: string | null) => string | null,
): Promise<number> {
  const aprovadas = story.frames.filter((f) => f.status === "aprovado");
  if (aprovadas.length === 0) return 0;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (let i = 0; i < aprovadas.length; i += 1) {
    const frame = aprovadas[i]!;
    const blob = await montarArteExport(frame, svgPorLogo(frame.comp.logo_id));
    zip.file(
      `${String(i + 1).padStart(2, "0")}_${nomeLimpo(frame.nome_arquivo)}${EXPORT_EXTENSAO}`,
      blob,
    );
  }
  // Imagem JPEG já vem comprimida. Guardar sem recomprimir deixa o zip muito mais rápido.
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  baixar(blob, `${nomeLimpo(story.nome_bloco || "story")}-artes.zip`);
  return aprovadas.length;
}
