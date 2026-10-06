import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { profileQueryOptions } from "@/lib/auth";
import { coresQueryOptions, nomePai, produtosQueryOptions } from "@/lib/biblioteca";
import {
  MOTIVOS,
  custosQueryOptions,
  estampasSimplesQueryOptions,
  gravarCusto,
  mesAtualIso,
  nomeMes,
  normalizar,
  somarMeses,
} from "@/lib/seeding";

export function PainelCustoSeeding() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const editavel = profile?.role === "admin" || profile?.role === "gestor";
  const qc = useQueryClient();
  const { data: custos = [] } = useQuery(custosQueryOptions);
  const [novoMes, setNovoMes] = useState("");

  function acrescentar() {
    const mes = novoMes ? `${novoMes}-01` : custos[0] ? somarMeses(custos[0].mes, 1) : mesAtualIso();
    if (custos.some((c) => c.mes === mes)) { toast.info("Esse mês já está na lista."); return; }
    const ultimo = custos.find((c) => c.mes <= mes)?.valor ?? custos[0]?.valor ?? 0;
    void gravarCusto(qc, mes, ultimo);
    setNovoMes("");
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h3 className="font-semibold">Custo da peça por mês</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Custo médio por peça, usado só para somar o custo das saídas no Seeding. Cada mês pode ter o seu; mês sem valor usa o último conhecido.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {custos.map((c) => (
          <li key={c.mes} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm">{nomeMes(c.mes)}</span>
            <CampoValor valor={c.valor} disabled={!editavel} onGravar={(v) => void gravarCusto(qc, c.mes, v)} />
          </li>
        ))}
      </ul>
      {editavel ? (
        <div className="mt-3 flex items-center gap-2">
          <Input type="month" value={novoMes} onChange={(e) => setNovoMes(e.target.value)} className="h-8 w-40" />
          <Button size="sm" variant="outline" className="gap-1" onClick={acrescentar}><Plus className="size-3.5" /> Acrescentar mês</Button>
        </div>
      ) : null}
    </section>
  );
}

function CampoValor({ valor, onGravar, disabled }: { valor: number; onGravar: (v: number) => void; disabled: boolean }) {
  const [v, setV] = useState(valor.toFixed(2).replace(".", ","));
  useEffect(() => setV(valor.toFixed(2).replace(".", ",")), [valor]);
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">R$</span>
      <Input
        value={v}
        disabled={disabled}
        inputMode="decimal"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = Number(v.replace(/\./g, "").replace(",", "."));
          if (!Number.isFinite(n) || n < 0) return setV(valor.toFixed(2).replace(".", ","));
          if (Math.round(n * 100) !== Math.round(valor * 100)) onGravar(Math.round(n * 100) / 100);
        }}
        className="h-8 w-24 text-right tabular-nums"
      />
    </div>
  );
}

type LinhaLida = {
  modelo: string; estampa: string; cor: string; tamanho: string; pessoa: string;
  pedido: boolean; produzida: boolean; enviada: boolean; captada: boolean; observacao: string;
  produto_id: string | null; produto_nome: string | null;
  cor_id: string | null; cor_nome: string | null;
  estampa_id: string | null; estampa_nome: string | null;
  casouProduto: boolean; casouCor: boolean; casouEstampa: boolean;
};

export function PainelImportarSeeding() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const qc = useQueryClient();
  const { data: produtos = [] } = useQuery(produtosQueryOptions);
  const { data: cores = [] } = useQuery(coresQueryOptions);
  const { data: estampas = [] } = useQuery(estampasSimplesQueryOptions);
  const [texto, setTexto] = useState("");
  const [mes, setMes] = useState(mesAtualIso().slice(0, 7));
  const [motivo, setMotivo] = useState<string>("Captação");
  const [linhas, setLinhas] = useState<LinhaLida[] | null>(null);
  const [existentes, setExistentes] = useState(0);
  const [importando, setImportando] = useState(false);

  const mapas = useMemo(() => ({
    prod: new Map(produtos.flatMap((p) => [[normalizar(nomePai(p)), p], [normalizar(p.nome_base), p]] as const)),
    cor: new Map(cores.flatMap((c) => [[normalizar(c.nome), c], [normalizar(c.nome_olist), c]] as const)),
    est: new Map(estampas.map((e) => [normalizar(e.nome), e] as const)),
  }), [produtos, cores, estampas]);

  if (profile?.role !== "admin") return null;

  async function conferir() {
    const sim = (s: string | undefined) => normalizar(s) === "sim";
    const lidas: LinhaLida[] = texto.split(/\r?\n/).filter((l) => l.trim()).map((l) => {
      const c = l.split("\t").map((x) => x.trim());
      const [modelo = "", estampa = "", cor = "", tamanho = "", pessoa = "", pe, pr, en, ca, obs = ""] = c;
      const p = mapas.prod.get(normalizar(modelo));
      const k = mapas.cor.get(normalizar(cor));
      const lisa = !estampa || normalizar(estampa) === "lisa";
      const e = lisa ? undefined : mapas.est.get(normalizar(estampa));
      return {
        modelo, estampa, cor, tamanho, pessoa, observacao: obs,
        pedido: sim(pe), produzida: sim(pr), enviada: sim(en), captada: sim(ca),
        produto_id: p?.id ?? null, produto_nome: p ? nomePai(p) : modelo || null,
        cor_id: k?.id ?? null, cor_nome: k?.nome ?? (cor || null),
        estampa_id: e?.id ?? null, estampa_nome: lisa ? null : e?.nome ?? estampa,
        casouProduto: !!p, casouCor: !!k, casouEstampa: lisa || !!e,
      };
    });
    setLinhas(lidas);
    const { data: r } = await supabase.from("social_seeding_remessas").select("id, social_seeding_pecas(count)").eq("mes", `${mes}-01`).eq("motivo", motivo).maybeSingle();
    const n = (r?.social_seeding_pecas as unknown as { count: number }[] | undefined)?.[0]?.count ?? 0;
    setExistentes(n);
  }

  async function importar() {
    if (!linhas?.length) return;
    setImportando(true);
    const iso = `${mes}-01`;
    let { data: r } = await supabase.from("social_seeding_remessas").select("id").eq("mes", iso).eq("motivo", motivo).maybeSingle();
    if (!r) {
      const res = await supabase.from("social_seeding_remessas").insert({ mes: iso, motivo, criado_por: profile?.id ?? null }).select("id").single();
      if (res.error) { setImportando(false); toast.error(res.error.message); return; }
      r = res.data;
    }
    const { error } = await supabase.from("social_seeding_pecas").insert(
      linhas.map((l, i) => ({
        remessa_id: r!.id, produto_id: l.produto_id, produto_nome: l.produto_nome, cor_id: l.cor_id, cor_nome: l.cor_nome,
        estampa_id: l.estampa_id, estampa_nome: l.estampa_nome, tamanho: l.tamanho || null, pessoa: l.pessoa || null,
        pedido: l.pedido, produzida: l.produzida, enviada: l.enviada, captada: l.captada, observacao: l.observacao || null,
        posicao: (existentes + i + 1) * 10,
      })),
    );
    setImportando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${linhas.length} peças importadas em ${nomeMes(iso)} · ${motivo}.`);
    setLinhas(null);
    setTexto("");
    void qc.invalidateQueries({ queryKey: ["seeding", "remessas"] });
    void qc.invalidateQueries({ queryKey: ["seeding", "painel"] });
    void qc.invalidateQueries({ queryKey: ["seeding", "pessoas"], exact: true });
  }

  const naoCasaram = linhas?.filter((l) => !l.casouProduto || !l.casouCor || !l.casouEstampa) ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h3 className="font-semibold">Importar camisetas enviadas</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Cole as linhas da planilha na ordem Modelo, Estampa, Cor, Tamanho, Influencer, Pedido, Produzida, Enviada, Captada, Observações.
      </p>
      <Textarea value={texto} onChange={(e) => { setTexto(e.target.value); setLinhas(null); }} rows={8} className="mt-3 font-mono text-xs" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input type="month" value={mes} onChange={(e) => { setMes(e.target.value); setLinhas(null); }} className="h-8 w-40" />
        <select value={motivo} onChange={(e) => { setMotivo(e.target.value); setLinhas(null); }} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
          {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <Button size="sm" variant="outline" disabled={!texto.trim() || !mes} onClick={() => void conferir()}>Conferir</Button>
      </div>
      {linhas ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            {linhas.length} linhas lidas · {linhas.filter((l) => l.casouProduto).length} com produto ·{" "}
            {linhas.filter((l) => l.casouCor).length} com cor · {linhas.filter((l) => l.casouEstampa).length} com estampa
          </p>
          {existentes > 0 ? (
            <p className="font-medium text-destructive">
              Esta remessa já tem {existentes} {existentes === 1 ? "peça" : "peças"}. Importar de novo vai duplicar.
            </p>
          ) : null}
          {naoCasaram.length ? (
            <ul className="max-h-48 overflow-auto rounded-md border border-border p-2 text-xs">
              {naoCasaram.map((l, i) => (
                <li key={i} className="py-0.5">
                  {[!l.casouProduto && `Modelo "${l.modelo}"`, !l.casouCor && `Cor "${l.cor}"`, !l.casouEstampa && `Estampa "${l.estampa}"`].filter(Boolean).join(" · ")}
                  <span className="text-muted-foreground"> — {l.pessoa || "sem pessoa"}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Button size="sm" disabled={importando || !linhas.length} onClick={() => void importar()}>Importar</Button>
        </div>
      ) : null}
    </section>
  );
}
