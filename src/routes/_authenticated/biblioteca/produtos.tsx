import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bloco, CampoAutoSave, ListaProdutos, SemAcesso, patchProdutoOtimista } from "@/components/biblioteca/comum";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import { textoSobreCor } from "@/config/produtos";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS,
  ORDEM_TAMANHOS,
  coresQueryOptions,
  gerarVariacoes,
  nomeOficial,
  nomePai,
  ordenarTamanhos,
  produtosQueryOptions,
  salvarCores,
  type Categoria,
  type CorBiblioteca,
  type ProdutoBiblioteca,
  type ProdutoCor,
} from "@/lib/biblioteca";
import { exportarProduto, exportarTodos } from "@/lib/biblioteca-export";

export const Route = createFileRoute("/_authenticated/biblioteca/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Biblioteca — Marketing Juff" },
      { name: "description", content: "Produtos da Juff, cores, tamanhos e nomes oficiais da Olist." },
      { property: "og:title", content: "Produtos — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Produtos da Juff, cores, tamanhos e nomes oficiais da Olist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
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
          {produto ? <Ficha key={produto.id} produto={produto} produtos={produtos} cores={cores} editavel={editavel} /> : null}
        </div>
      </div>
    </AppShell>
  );
}

function Ficha({ produto: p, produtos, cores, editavel }: { produto: ProdutoBiblioteca; produtos: ProdutoBiblioteca[]; cores: CorBiblioteca[]; editavel: boolean }) {
  const qc = useQueryClient();
  const patch = (x: Parameters<typeof patchProdutoOtimista>[2]) => patchProdutoOtimista(qc, p.id, x);
  const variacoes = useMemo(() => gerarVariacoes(p, cores), [p, cores]);
  const porId = new Map(cores.map((c) => [c.id, c]));

  const primeiraCor = [...p.cores].map((c) => porId.get(c.cor_id)).filter(Boolean).sort((a, b) => a!.posicao - b!.posicao)[0];
  const tams = ordenarTamanhos(p.tamanhos);
  const maior = tams[tams.length - 1];

  function gravarCores(novas: ProdutoCor[]) {
    const antes = qc.getQueryData<ProdutoBiblioteca[]>(produtosQueryOptions.queryKey);
    qc.setQueryData<ProdutoBiblioteca[]>(produtosQueryOptions.queryKey, (l) => l?.map((x) => (x.id === p.id ? { ...x, cores: novas } : x)));
    salvarCores(p.id, novas).catch((e: Error) => {
      qc.setQueryData(produtosQueryOptions.queryKey, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  const marcada = new Map(p.cores.map((c) => [c.cor_id, c.categoria]));
  const visiveis = cores.filter((c) => c.ativo || marcada.has(c.id));

  return (
    <div className="space-y-4">
      <Bloco titulo="Nome">
        <div className="grid gap-3 sm:grid-cols-2">
          <Linha rotulo="Nome base">
            {editavel ? <CampoAutoSave valor={p.nome_base} onSalvar={(v) => v.trim() && patch({ nome_base: v.trim() })} className="h-8" /> : <span className="text-sm">{p.nome_base}</span>}
          </Linha>
          <Linha rotulo="Tecido">
            {editavel ? (
              <div className="flex items-center gap-2">
                <CampoAutoSave valor={p.tecido} onSalvar={(v) => patch({ tecido: v.trim() })} className="h-8" />
                <Switch checked={p.usa_tecido} onCheckedChange={(v) => patch({ usa_tecido: v })} aria-label="Usar tecido" />
              </div>
            ) : <span className="text-sm">{p.usa_tecido ? p.tecido : "Sem tecido"}</span>}
          </Linha>
          <Linha rotulo="Sufixo">
            {editavel ? (
              <div className="flex items-center gap-2">
                <CampoAutoSave valor={p.sufixo} onSalvar={(v) => patch({ sufixo: v.trim() })} className="h-8" />
                <Switch checked={p.usa_sufixo} onCheckedChange={(v) => patch({ usa_sufixo: v })} aria-label="Usar sufixo" />
              </div>
            ) : <span className="text-sm">{p.usa_sufixo && p.sufixo ? p.sufixo : "Sem sufixo"}</span>}
          </Linha>
          <Linha rotulo="XTRA nos tamanhos grandes">
            <div className="flex flex-wrap items-center gap-2">
              {editavel ? (
                <Switch checked={p.usa_xtra && !p.usa_sufixo} disabled={p.usa_sufixo} onCheckedChange={(v) => patch({ usa_xtra: v })} aria-label="XTRA" />
              ) : <span className="text-sm">{p.usa_xtra && !p.usa_sufixo ? "Sim" : "Não"}</span>}
              {p.usa_sufixo ? (
                <span className="text-xs text-muted-foreground">Produto com sufixo não usa XTRA na Olist.</span>
              ) : (
                ORDEM_TAMANHOS.map((t) => {
                  const on = p.tamanhos_xtra.includes(t);
                  return (
                    <button key={t} type="button" disabled={!editavel || !p.usa_xtra}
                      onClick={() => patch({ tamanhos_xtra: ordenarTamanhos(on ? p.tamanhos_xtra.filter((x) => x !== t) : [...p.tamanhos_xtra, t]) })}
                      className={cn("rounded-md border px-1.5 py-0.5 text-xs", on ? "border-primary bg-primary-soft" : "border-border text-muted-foreground", (!editavel || !p.usa_xtra) && "cursor-default opacity-60")}>
                      {t}
                    </button>
                  );
                })
              )}
            </div>
          </Linha>
        </div>
        <div className="mt-4 space-y-1 rounded-lg bg-secondary/60 p-3 font-mono text-xs">
          <div><span className="inline-block w-28 text-muted-foreground">Produto pai</span>{nomePai(p)}</div>
          <div><span className="inline-block w-28 text-muted-foreground">Exemplo</span>{primeiraCor && maior ? nomeOficial(p, primeiraCor.nome_olist, maior) : "Marque uma cor e um tamanho"}</div>
        </div>
      </Bloco>

      <Bloco titulo="Tamanhos">
        <div className="flex flex-wrap gap-2">
          {ORDEM_TAMANHOS.map((t) => {
            const on = p.tamanhos.includes(t);
            return (
              <button key={t} type="button" disabled={!editavel}
                onClick={() => patch({ tamanhos: ordenarTamanhos(on ? p.tamanhos.filter((x) => x !== t) : [...p.tamanhos, t]) })}
                className={cn("min-w-12 rounded-lg border px-3 py-1.5 text-sm font-medium", on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground", !editavel && "cursor-default")}>
                {t}
              </button>
            );
          })}
        </div>
      </Bloco>

      <Bloco titulo="Cores" acoes={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {p.cores.length} marcadas
          {editavel ? (
            <>
              <Button variant="outline" size="sm" className="h-7" onClick={() => gravarCores(cores.filter((c) => c.ativo || marcada.has(c.id)).map((c) => ({ cor_id: c.id, categoria: marcada.get(c.id) ?? "Normal" })))}>Marcar todas</Button>
              <Button variant="outline" size="sm" className="h-7" onClick={() => gravarCores([])}>Limpar</Button>
            </>
          ) : null}
        </div>
      }>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {visiveis.map((c) => {
            const cat = marcada.get(c.id);
            const on = cat !== undefined;
            return (
              <div key={c.id} className={cn("overflow-hidden rounded-lg border-2", on ? "border-foreground" : "border-transparent opacity-35")}>
                <button type="button" disabled={!editavel}
                  onClick={() => gravarCores(on ? p.cores.filter((x) => x.cor_id !== c.id) : [...p.cores, { cor_id: c.id, categoria: "Normal" }])}
                  className={cn("flex h-12 w-full items-center justify-center px-1 text-xs font-medium", !editavel && "cursor-default")}
                  style={{ backgroundColor: c.hex, color: textoSobreCor(c.hex) }}>
                  {c.nome}
                </button>
                {on ? (
                  <div className="flex bg-card text-[11px]">
                    {CATEGORIAS.map((k) => (
                      <button key={k} type="button" disabled={!editavel}
                        onClick={() => gravarCores(p.cores.map((x) => (x.cor_id === c.id ? { ...x, categoria: k as Categoria } : x)))}
                        className={cn("flex-1 py-0.5", cat === k ? "bg-primary-soft font-semibold" : "text-muted-foreground", !editavel && "cursor-default")}>
                        {k}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Bloco>

      <Bloco titulo="Nomes oficiais" acoes={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => void exportarProduto(p, cores)}><Download className="size-4" /> Exportar este produto</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => void exportarTodos(produtos, cores)}><Download className="size-4" /> Exportar todos</Button>
        </div>
      }>
        <p className="mb-2 text-sm text-muted-foreground">Este produto gera {variacoes.length} variações.</p>
        <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2">Nome oficial</th><th className="px-3 py-2">Cor</th><th className="px-3 py-2">Categoria</th></tr>
            </thead>
            <tbody>
              {variacoes.map((v) => (
                <tr key={v.nome} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono text-xs">{v.nome}</td>
                  <td className="px-3 py-1.5"><span className="mr-1.5 inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: v.hex }} />{v.cor}</td>
                  <td className="px-3 py-1.5">{v.categoria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{rotulo}</div>
      {children}
    </div>
  );
}
