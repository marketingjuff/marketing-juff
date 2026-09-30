import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bloco, CampoAutoSave, ListaProdutos, SemAcesso, patchProdutoOtimista } from "@/components/biblioteca/comum";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  PONTOS,
  coresQueryOptions,
  folgaSugerida,
  medidasQueryOptions,
  nomeCurto,
  ordenarTamanhos,
  produtosQueryOptions,
  salvarMedidas,
  type Medida,
  type ProdutoBiblioteca,
} from "@/lib/biblioteca";
import { baixarXlsx } from "@/lib/xlsx-simples";

export const Route = createFileRoute("/_authenticated/biblioteca/medidas")({
  head: () => ({
    meta: [
      { title: "Medidas — Biblioteca — Marketing Juff" },
      { name: "description", content: "Fichas de medidas dos produtos Juff por tamanho." },
      { property: "og:title", content: "Medidas — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Fichas de medidas dos produtos Juff por tamanho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MedidasPage,
});

function MedidasPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.produtos");
  const editavel = profile?.role === "admin";
  const { data: produtos = [] } = useQuery({ ...produtosQueryOptions, enabled: pode });
  const { data: cores = [] } = useQuery({ ...coresQueryOptions, enabled: pode });
  const [sel, setSel] = useState<string | null>(null);

  if (!pode) return <AppShell><SemAcesso /></AppShell>;
  const produto = produtos.find((p) => p.id === sel) ?? produtos[0];

  return (
    <AppShell largura="ampla">
      <div className="flex flex-col gap-4 md:flex-row">
        <ListaProdutos produtos={produtos} cores={cores} selecionado={produto?.id ?? null} onSelecionar={setSel} editavel={editavel} />
        <div className="min-w-0 flex-1">
          {produto ? <FichaMedidas key={produto.id} produto={produto} editavel={editavel} /> : null}
        </div>
      </div>
    </AppShell>
  );
}

type Campo = "minimo" | "alvo" | "maximo";
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(Number(n)));

function FichaMedidas({ produto: p, editavel }: { produto: ProdutoBiblioteca; editavel: boolean }) {
  const qc = useQueryClient();
  const opts = medidasQueryOptions(p.id);
  const { data: medidas = [], isSuccess } = useQuery(opts);
  const [sugerir, setSugerir] = useState(true);
  const pontos = PONTOS.filter((x) => p.pontos.includes(x));
  const tamanhos = ordenarTamanhos(p.tamanhos);
  const mapa = new Map(medidas.map((m) => [`${m.ponto}|${m.tamanho}`, m]));

  function gravar(ponto: string, tamanho: string, campo: Campo, texto: string) {
    const t = texto.trim().replace(",", ".");
    if (t !== "" && !/^\d{1,4}(\.\d)?$/.test(t)) {
      toast.error("Use número com no máximo uma casa decimal.");
      return;
    }
    const atual = mapa.get(`${ponto}|${tamanho}`) ?? { produto_id: p.id, ponto, tamanho, minimo: null, alvo: null, maximo: null };
    const novo: Medida = { ...atual, [campo]: t === "" ? null : Number(t) };
    if (campo === "alvo" && sugerir && novo.alvo !== null && atual.minimo === null && atual.maximo === null) {
      const f = folgaSugerida(ponto, tamanho);
      novo.minimo = Math.round((novo.alvo - f) * 10) / 10;
      novo.maximo = Math.round((novo.alvo + f) * 10) / 10;
    }
    const antes = qc.getQueryData<Medida[]>(opts.queryKey);
    qc.setQueryData<Medida[]>(opts.queryKey, (l = []) => {
      const resto = l.filter((m) => !(m.ponto === ponto && m.tamanho === tamanho));
      return [...resto, novo];
    });
    salvarMedidas(p.id, [{ ponto, tamanho, minimo: fmt(novo.minimo), alvo: fmt(novo.alvo), maximo: fmt(novo.maximo) }]).catch((e: Error) => {
      qc.setQueryData(opts.queryKey, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  async function exportar() {
    const get = (pt: string, t: string) => mapa.get(`${pt}|${t}`);
    const producao = [
      ["TAMANHO", ...pontos.flatMap((pt) => [`${pt} mínimo`, `${pt} alvo`, `${pt} máximo`])],
      ...tamanhos.map((t) => [t, ...pontos.flatMap((pt) => { const m = get(pt, t); return [m?.minimo ?? null, m?.alvo ?? null, m?.maximo ?? null].map((v) => (v === null ? null : Number(v))); })]),
    ];
    const cliente = [
      ["TAMANHO", ...pontos],
      ...tamanhos.map((t) => [t, ...pontos.map((pt) => { const v = get(pt, t)?.alvo; return v === null || v === undefined ? null : Number(v); })]),
    ];
    await baixarXlsx(`Juff medidas ${nomeCurto(p)}`, [
      { nome: "PRODUÇÃO", linhas: producao },
      { nome: "CLIENTE", linhas: cliente },
    ]);
  }

  return (
    <div className="space-y-4">
      <Bloco titulo="Pontos de medição">
        <div className="flex flex-wrap gap-2">
          {PONTOS.map((pt) => {
            const on = p.pontos.includes(pt);
            return (
              <button key={pt} type="button" disabled={!editavel}
                onClick={() => patchProdutoOtimista(qc, p.id, { pontos: PONTOS.filter((x) => (x === pt ? !on : p.pontos.includes(x))) })}
                className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium capitalize", on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground", !editavel && "cursor-default")}>
                {pt}
              </button>
            );
          })}
        </div>
      </Bloco>

      <Bloco titulo="Medidas" acoes={
        <div className="flex items-center gap-3">
          {editavel ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={sugerir} onCheckedChange={setSugerir} /> Sugerir tolerância
            </label>
          ) : null}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => void exportar()}><Download className="size-4" /> Exportar medidas</Button>
        </div>
      }>
        {isSuccess && medidas.length === 0 ? (
          <p className="mb-2 text-sm text-muted-foreground">Este produto ainda não tem medidas cadastradas.</p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="text-sm">
            <thead className="bg-secondary text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tamanho</th>
                {pontos.map((pt) => <th key={pt} className="px-3 py-2 capitalize">{pt}</th>)}
              </tr>
            </thead>
            <tbody>
              {tamanhos.map((t) => (
                <tr key={t} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{t}</td>
                  {pontos.map((pt) => {
                    const m = mapa.get(`${pt}|${t}`);
                    return (
                      <td key={pt} className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {(["minimo", "alvo", "maximo"] as Campo[]).map((c, i) => (
                            <span key={c} className="flex items-center gap-1">
                              {i > 0 ? <span className="text-muted-foreground">–</span> : null}
                              {editavel ? (
                                <CampoAutoSave valor={fmt(m?.[c])} inputMode="decimal" onSalvar={(v) => gravar(pt, t, c, v)}
                                  className={cn("h-8 w-16 px-2 text-center", c === "alvo" && "font-semibold")} />
                              ) : (
                                <span className={cn("inline-block w-10 text-center", c === "alvo" && "font-semibold")}>{fmt(m?.[c])}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Os três números são mínimo, alvo e máximo, em centímetros. A tabela do cliente mostra apenas o alvo.
        </p>
      </Bloco>
    </div>
  );
}
