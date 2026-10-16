import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FRENTE_UNICA, MESES } from "@/lib/estrategia";

export type TipoEmail = { id: string; nome: string; posicao: number; ativo: boolean };

export type RegraEmail = {
  id: string;
  titulo: string;
  texto: string;
  tipo_id: string | null;
  posicao: number;
  ativo: boolean;
};

export type EmailCrono = {
  id: string;
  data: string; // aaaa-mm-dd
  tipo_id: string | null;
  tema: string;
  conteudo: string;
  chamada: string;
  posicao: number;
};

export type PedidoItem = { tipo_id: string; quantidade: number; detalhe: string };

export type PedidoEmails = {
  total: number;
  itens: PedidoItem[];
  extras: number;
  observacoes: string;
  dias_evitar: string;
};

export type CronogramaMes = { docUrl: string; emails: EmailCrono[] };

const PADRAO = { staleTime: 60_000, refetchOnWindowFocus: false } as const;

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ---------------- catálogos ----------------

export const tiposEmailQueryOptions = () =>
  queryOptions({
    queryKey: ["estrategia", "email-tipos"],
    queryFn: async (): Promise<TipoEmail[]> => {
      const { data, error } = await supabase
        .from("estrategia_email_tipos")
        .select("id, nome, posicao, ativo")
        .order("posicao", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TipoEmail[];
    },
    ...PADRAO,
  });

export const regrasEmailQueryOptions = () =>
  queryOptions({
    queryKey: ["estrategia", "email-regras"],
    queryFn: async (): Promise<RegraEmail[]> => {
      const { data, error } = await supabase
        .from("estrategia_email_regras")
        .select("id, titulo, texto, tipo_id, posicao, ativo")
        .order("posicao", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RegraEmail[];
    },
    ...PADRAO,
  });

export async function criarTipoEmail(nome: string, posicao: number): Promise<void> {
  const { error } = await supabase.from("estrategia_email_tipos").insert({ nome: nome.trim(), posicao });
  if (error) throw error;
}

export async function atualizarTipoEmail(
  id: string, patch: Partial<Pick<TipoEmail, "nome" | "ativo">>,
): Promise<void> {
  const p = patch.nome !== undefined ? { ...patch, nome: patch.nome.trim() } : patch;
  const { error } = await supabase.from("estrategia_email_tipos").update(p).eq("id", id);
  if (error) throw error;
}

export async function reordenarTiposEmail(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("estrategia_email_reordenar", { _tabela: "tipos", _ids: ids });
  if (error) throw error;
}

export async function criarRegraEmail(posicao: number): Promise<void> {
  const { error } = await supabase
    .from("estrategia_email_regras")
    .insert({ titulo: "Nova regra", texto: "", posicao });
  if (error) throw error;
}

export async function atualizarRegraEmail(
  id: string, patch: Partial<Pick<RegraEmail, "titulo" | "texto" | "tipo_id" | "ativo">>,
): Promise<void> {
  const { error } = await supabase.from("estrategia_email_regras").update(patch).eq("id", id);
  if (error) throw error;
}

export async function excluirRegraEmail(id: string): Promise<void> {
  const { error } = await supabase.from("estrategia_email_regras").delete().eq("id", id);
  if (error) throw error;
}

export async function reordenarRegrasEmail(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("estrategia_email_reordenar", { _tabela: "regras", _ids: ids });
  if (error) throw error;
}

// ---------------- cronograma do mês ----------------

export const emailsQueryOptions = (ano: number, mes: number) =>
  queryOptions({
    queryKey: ["estrategia", "emails", ano, mes],
    queryFn: async (): Promise<CronogramaMes> => {
      const { data, error } = await supabase
        .from("estrategia_atas")
        .select("id, emails_doc_url, estrategia_emails(id, data, tipo_id, tema, conteudo, chamada, posicao)")
        .eq("frente", FRENTE_UNICA)
        .eq("ano", ano)
        .eq("mes", mes)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { docUrl: "", emails: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emails = (((data as any).estrategia_emails ?? []) as EmailCrono[]).slice().sort(ordenar);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { docUrl: (data as any).emails_doc_url ?? "", emails };
    },
    ...PADRAO,
  });

export function ordenar(a: EmailCrono, b: EmailCrono) {
  return a.data === b.data ? a.posicao - b.posicao : a.data < b.data ? -1 : 1;
}

const PEDIDO_VAZIO: PedidoEmails = { total: 0, itens: [], extras: 0, observacoes: "", dias_evitar: "" };

export const pedidoQueryOptions = (ano: number, mes: number) =>
  queryOptions({
    queryKey: ["estrategia", "email-pedido", ano, mes],
    queryFn: async (): Promise<PedidoEmails> => {
      const { data: ata, error: e1 } = await supabase
        .from("estrategia_atas")
        .select("id")
        .eq("frente", FRENTE_UNICA).eq("ano", ano).eq("mes", mes)
        .maybeSingle();
      if (e1) throw e1;
      if (!ata) return PEDIDO_VAZIO;
      const { data, error } = await supabase
        .from("estrategia_email_pedidos")
        .select("total, itens, extras, observacoes, dias_evitar")
        .eq("ata_id", ata.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return PEDIDO_VAZIO;
      return {
        total: data.total,
        itens: (Array.isArray(data.itens) ? data.itens : []) as unknown as PedidoItem[],
        extras: data.extras,
        observacoes: data.observacoes,
        dias_evitar: data.dias_evitar,
      };
    },
    ...PADRAO,
  });

async function idDaAta(ano: number, mes: number): Promise<string> {
  const { data, error } = await supabase.rpc("estrategia_emails_ata_id", { _ano: ano, _mes: mes });
  if (error) throw error;
  return data as string;
}

export async function criarEmail(
  ano: number, mes: number, parcial: Partial<Omit<EmailCrono, "id">>,
): Promise<void> {
  const ataId = await idDaAta(ano, mes);
  const { error } = await supabase.from("estrategia_emails").insert({
    ata_id: ataId,
    data: parcial.data ?? `${ano}-${String(mes).padStart(2, "0")}-01`,
    tipo_id: parcial.tipo_id ?? null,
    tema: parcial.tema ?? "",
    conteudo: parcial.conteudo ?? "",
    chamada: parcial.chamada ?? "",
    posicao: parcial.posicao ?? 0,
  });
  if (error) throw error;
}

export async function atualizarEmail(
  id: string, patch: Partial<Pick<EmailCrono, "data" | "tipo_id" | "tema" | "conteudo" | "chamada">>,
): Promise<void> {
  const { error } = await supabase.from("estrategia_emails").update(patch).eq("id", id);
  if (error) throw error;
}

export async function excluirEmail(id: string): Promise<void> {
  const { error } = await supabase.from("estrategia_emails").delete().eq("id", id);
  if (error) throw error;
}

export async function aplicarImportacao(
  ano: number, mes: number, linhas: LinhaLida[], substituir: boolean,
): Promise<number> {
  const { data, error } = await supabase.rpc("estrategia_emails_aplicar", {
    _ano: ano,
    _mes: mes,
    _linhas: linhas.map((l) => ({
      data: l.data, tipo_id: l.tipo_id ?? "", tema: l.tema, conteudo: l.conteudo, chamada: l.chamada,
    })),
    _substituir: substituir,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function gravarPedido(ano: number, mes: number, pedido: PedidoEmails): Promise<void> {
  const { error } = await supabase.rpc("estrategia_email_pedido_gravar", {
    _ano: ano, _mes: mes, _total: pedido.total,
    _itens: pedido.itens as unknown as never,
    _extras: pedido.extras, _observacoes: pedido.observacoes, _dias_evitar: pedido.dias_evitar,
  });
  if (error) throw error;
}

export async function gravarDocUrl(ano: number, mes: number, url: string): Promise<void> {
  const { error } = await supabase.rpc("estrategia_emails_doc_url", { _ano: ano, _mes: mes, _url: url });
  if (error) throw error;
}

// ---------------- leitura do texto devolvido ----------------

export type LinhaLida = {
  data: string;
  tipo_id: string | null;
  tipoEscrito: string;
  tema: string;
  conteudo: string;
  chamada: string;
};

export type LeituraCrono = {
  linhas: LinhaLida[];
  ignoradas: number;
  semTipo: number;
  foraDoMes: number;
};

export function normalizar(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function lerData(t: string): string {
  const s = t.trim();
  let a: number, m: number, d: number;
  let r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (r) { d = +r[1]!; m = +r[2]!; a = +r[3]!; }
  else {
    r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!r) return "";
    a = +r[1]!; m = +r[2]!; d = +r[3]!;
  }
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function lerCronograma(texto: string, tipos: TipoEmail[], ano: number, mes: number): LeituraCrono {
  const out: LeituraCrono = { linhas: [], ignoradas: 0, semTipo: 0, foraDoMes: 0 };
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}-`;
  for (const bruta of texto.split(/\r?\n/)) {
    const partes = bruta.split("|").map((p) => p.trim());
    if ((partes[0] ?? "").toUpperCase() !== "EMAIL") continue;
    const data = lerData(partes[1] ?? "");
    if (!data) { out.ignoradas++; continue; }
    const tipoEscrito = partes[2] ?? "";
    const tipo = tipos.find((t) => normalizar(t.nome) === normalizar(tipoEscrito));
    if (!tipo) out.semTipo++;
    if (!data.startsWith(prefixo)) out.foraDoMes++;
    out.linhas.push({
      data, tipo_id: tipo?.id ?? null, tipoEscrito,
      tema: partes[3] ?? "", conteudo: partes[4] ?? "", chamada: partes[5] ?? "",
    });
  }
  return out;
}

export function reciboLeitura(l: LeituraCrono, mes: number): string {
  const n = l.linhas.length;
  if (n === 0 && l.ignoradas === 0) return "Nenhuma linha EMAIL encontrada ainda.";
  const partes: string[] = [];
  partes.push(`Li ${n} ${n === 1 ? "linha" : "linhas"}`);
  if (l.foraDoMes === 0 && l.semTipo === 0 && l.ignoradas === 0 && n > 0) {
    return `${partes[0]}, ${n === 1 ? "em" : "todas em"} ${MESES[mes - 1]!.toLowerCase()}, ${n === 1 ? "tipo reconhecido" : "todos os tipos reconhecidos"}.`;
  }
  if (l.foraDoMes > 0) partes.push(`${l.foraDoMes} fora de ${MESES[mes - 1]!.toLowerCase()}`);
  if (l.semTipo > 0) partes.push(`${l.semTipo} ${l.semTipo === 1 ? "tipo não reconhecido" : "tipos não reconhecidos"}`);
  if (l.ignoradas > 0) partes.push(`${l.ignoradas} ${l.ignoradas === 1 ? "linha sem data foi descartada" : "linhas sem data foram descartadas"}`);
  return partes.join(", ") + ".";
}

// ---------------- textos dos prompts ----------------

type Contexto = {
  ano: number;
  mes: number;
  campos: { label: string; valor: string }[];
  anotacoes: string;
  decisoes: string[];
  tipos: TipoEmail[];
  regras: RegraEmail[];
};

function blocoContexto(c: Contexto) {
  return c.campos
    .filter((x) => x.valor.trim() && !normalizar(x.label).startsWith("CAPTACAO"))
    .map((x) => `${x.label.toUpperCase()}\n${x.valor.trim()}`)
    .join("\n\n");
}

function ponto(t: string) {
  const s = t.trim();
  return s && !/[.!?]$/.test(s) ? `${s}.` : s;
}

function blocoRegras(c: Contexto): string | null {
  const ativas = c.regras.filter((r) => r.ativo && r.texto.trim());
  if (!ativas.length) return null;
  const gerais = ativas.filter((r) => !r.tipo_id);
  const deTipo = ativas.filter((r) => r.tipo_id);
  const linhas = [
    ...gerais.map((r) => [ponto(r.titulo), ponto(r.texto)].filter(Boolean).join(" ")),
    ...deTipo.map((r) => {
      const tipo = c.tipos.find((t) => t.id === r.tipo_id)?.nome ?? "";
      return [ponto(tipo), ponto(r.titulo), ponto(r.texto)].filter(Boolean).join(" ");
    }),
  ];
  return `REGRAS DA MARCA\n${linhas.join("\n")}`;
}

export function promptCronograma(c: Contexto, p: PedidoEmails): string {
  const nomeMes = MESES[c.mes - 1]!.toLowerCase();
  const ultimo = new Date(c.ano, c.mes, 0).getDate();
  const mm = String(c.mes).padStart(2, "0");
  const dias = p.dias_evitar.split(",").map((x) => x.trim()).filter(Boolean)
    .map((x) => DIAS_SEMANA[Number(x)]).filter(Boolean);
  const itens = p.itens.filter((i) => i.tipo_id && i.quantidade > 0).map((i) => {
    const nome = c.tipos.find((t) => t.id === i.tipo_id)?.nome ?? "";
    return i.detalhe.trim() ? `${nome}: ${i.quantidade}. ${ponto(i.detalhe)}` : `${nome}: ${i.quantidade}.`;
  });
  const regras = blocoRegras(c);
  const partes = [
    `Monte o cronograma de e-mail marketing da Juff Store para ${nomeMes} de ${c.ano}.`,
    `CONTEXTO DO MÊS\n${blocoContexto(c) || "nenhum"}`,
    `ANOTAÇÕES\n${c.anotacoes.trim() || "nenhuma"}`,
    `DECISÕES DA REUNIÃO\n${c.decisoes.filter((d) => d.trim()).join("\n") || "nenhuma"}`,
    ...(regras ? [regras] : []),
    [
      "O QUE EU PRECISO",
      `Total de e-mails no mês: ${p.total}`,
      ...itens,
      `A seu critério: ${p.extras} e-mails, escolhidos conforme o histórico e o contexto acima.`,
      `Evitar os dias da semana: ${dias.length ? dias.join(", ") : "nenhum"}`,
      `Observações: ${p.observacoes.trim() || "nenhuma"}`,
    ].join("\n"),
    [
      "COMO ESCOLHER AS DATAS",
      `Todas as datas precisam cair dentro de ${nomeMes} de ${c.ano}, entre 01/${mm}/${c.ano} e ${ultimo}/${mm}/${c.ano}.`,
      "Nenhuma data pode se repetir.",
      "Respeite as datas comemorativas e a vigência das promoções descritas no contexto.",
      "Distribua o restante de forma equilibrada ao longo do mês, sem deixar dois e-mails em dias seguidos nem buracos longos.",
    ].join("\n"),
    [
      "COMO ESCREVER CADA CAMPO",
      "Tema é curto, no máximo seis palavras, e não repete o nome do tipo.",
      "Conteúdo é um briefing de até cinco frases, dizendo qual produto entra, qual é o ângulo, qual mecânica ou cupom vale, e para quem o e-mail fala. Ele será usado depois como instrução para escrever o e-mail inteiro, então precisa bastar sozinho.",
      "Chamada secundária é o gancho extra do mesmo disparo, em até cinco frases, dizendo o que é oferecido e para onde leva. Quando o e-mail não tiver gancho extra, deixe em branco.",
      "As regras da marca acima valem também aqui. Não escreva no Conteúdo nem na Chamada secundária nada que uma regra proíba para aquele tipo.",
      "Não use barra vertical dentro de nenhum campo.",
      "Escreva cada e-mail em uma única linha do arquivo.",
    ].join("\n"),
    [
      "FORMATO DA RESPOSTA",
      "Devolva apenas linhas no formato abaixo, uma por e-mail, em ordem de data. Pode escrever o que quiser antes e depois, eu só aproveito estas linhas.",
      "",
      "EMAIL | dd/mm/aaaa | Tipo | Tema | Conteúdo | Chamada secundária",
      "",
      "O campo Tipo precisa ser escrito exatamente como um dos nomes abaixo, com acento e espaçamento iguais, sem abreviar, sem inventar nome novo e sem usar nenhum tipo fora desta lista.",
      c.tipos.filter((t) => t.ativo).map((t) => t.nome).join(", "),
    ].join("\n"),
  ];
  return partes.join("\n\n");
}

export function promptTextos(c: Contexto, emails: EmailCrono[]): string {
  const nomeMes = MESES[c.mes - 1]!.toLowerCase();
  const regras = blocoRegras(c);
  const linhas = emails.slice().sort(ordenar).map((e) => {
    const [, m, d] = e.data.split("-");
    const tipo = c.tipos.find((t) => t.id === e.tipo_id)?.nome ?? "";
    return `${d}/${m} | ${tipo} | ${e.tema}\nConteúdo: ${e.conteudo}\nChamada secundária: ${e.chamada.trim() || "nenhuma"}`;
  });
  return [
    `Escreva os e-mails de ${nomeMes} de ${c.ano} da Juff Store, seguindo a formatação que você já conhece.`,
    `CONTEXTO DO MÊS\n${blocoContexto(c) || "nenhum"}`,
    `ANOTAÇÕES\n${c.anotacoes.trim() || "nenhuma"}`,
    ...(regras ? [regras] : []),
    `OS E-MAILS\n${linhas.join("\n\n")}`,
    "Respeite a mecânica, o cupom e a vigência descritos no contexto. Cada e-mail precisa conversar com o tema e o conteúdo da linha dele. As regras da marca valem para todos os e-mails, e as regras amarradas a um tipo valem para os e-mails daquele tipo.",
  ].join("\n\n");
}

export type { Contexto as ContextoPrompt };
