import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, FileText, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Bloco, CampoAutoSave } from "@/components/biblioteca/comum";
import { Bolinha, CardReceita, useCoresEstampa, type TamanhoCard } from "@/components/biblioteca/EstampaVisual";
import type { CorEstampa } from "@/lib/biblioteca-estampa";
import { arrastavel, arrastavelEstampa } from "@/lib/atalhos-paginas";
import { PainelCombos } from "@/components/biblioteca/PainelCombos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { coresQueryOptions, produtosQueryOptions, type CorBiblioteca, type ProdutoBiblioteca } from "@/lib/biblioteca";
import {
  ROTULO_GENERO,
  apagarEstampa,
  apagarGrupo,
  apagarReceita,
  categoriasEstampaQueryOptions,
  combosQueryOptions,
  criarCategoria,
  criarEstampa,
  criarGrupo,
  definirCoresCamiseta,
  definirPapeis,
  enviarArquivoEstampa,
  estampaQueryOptions,
  estampasQueryOptions,
  generoDoGrupo,
  generoDoProduto,
  moverModelo,
  nomeProdutoEstampa,
  registrarCombo,
  salvarEstampa,
  salvarGrupo,
  salvarReceita,
  salvarTipoEstampa,
  salvarPublicoReceita,
  textoCmykItem,
  urlsEstampaQueryOptions,
  type Combo,
  type EstampaCompleta,
  type Grupo,
  type ItemCor,
  type Receita,
  definirCoresGrupo,
} from "@/lib/biblioteca-estampas";
import { supabase } from "@/integrations/supabase/client";
import { baixarXlsx } from "@/lib/xlsx-simples";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/biblioteca/catalogo-estampas")({
  validateSearch: (s: Record<string, unknown>): { id?: string; visao?: string; combo?: string } => ({
    ...(typeof s["id"] === "string" ? { id: s["id"] } : {}),
    ...(typeof s["visao"] === "string" ? { visao: s["visao"] } : {}),
    ...(typeof s["combo"] === "string" ? { combo: s["combo"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Estampas — Biblioteca — Marketing Juff" },
      { name: "description", content: "Catálogo de estampas da Juff Store com receitas de cor por modelo e camiseta." },
      { property: "og:title", content: "Estampas — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Catálogo de estampas da Juff Store com receitas de cor por modelo e camiseta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CatalogoPage,
});

const PERM = "biblioteca.catalogo_estampas";
const K_LISTA = estampasQueryOptions.queryKey;
const K_COMBOS = combosQueryOptions.queryKey;

function CatalogoPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, PERM);
  const editavel = canEdit(profile, PERM);
  const { id, visao, combo } = Route.useSearch();
  if (!pode) {
    return (
      <AppShell largura="ampla">
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Você não tem acesso ao catálogo de estampas.</p>
      </AppShell>
    );
  }
  return (
    <AppShell largura="ampla">
      {!editavel ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Você está em modo de consulta. Pode ver, copiar e baixar, mas não alterar.
        </p>
      ) : null}
      {id ? <Ficha id={id} editavel={editavel} /> : <Lista editavel={editavel} visaoInicial={visao === "combos" ? "combos" : "estampas"} comboInicial={combo ?? null} />}
    </AppShell>
  );
}

// ---------------- Lista ----------------

function Lista({ editavel, visaoInicial = "estampas", comboInicial = null }: { editavel: boolean; visaoInicial?: "estampas" | "combos"; comboInicial?: string | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: estampas = [] } = useQuery(estampasQueryOptions);
  const { data: categorias = [] } = useQuery(categoriasEstampaQueryOptions);
  const { data: cores = [] } = useQuery(coresQueryOptions);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState("");
  const [visao, setVisao] = useState<"estampas" | "combos">(visaoInicial);

  const q = busca.trim().toLowerCase();
  const filtradas = estampas
    .filter((e) => !q || e.nome.toLowerCase().includes(q))
    .sort((a, b) => Number(a.situacao === "descontinuado") - Number(b.situacao === "descontinuado"));
  const grupos = [
    ...categorias.map((c) => ({ id: c.id, nome: c.nome })),
    { id: null as string | null, nome: "Sem categoria" },
  ].map((g) => ({ ...g, itens: filtradas.filter((e) => e.categoria_id === g.id) })).filter((g) => g.itens.length);

  async function criar() {
    const nome = novo.trim();
    if (!nome) return;
    try {
      const id = await criarEstampa(nome, cores);
      setNovo("");
      void qc.invalidateQueries({ queryKey: K_LISTA });
      void navigate({ to: "/biblioteca/catalogo-estampas", search: { id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-border">
        <Button
          type="button"
          variant="ghost"
          className={cn("rounded-b-none", visao === "estampas" && "border-b-2 border-primary text-foreground")}
          onClick={() => setVisao("estampas")}
          {...arrastavel("/biblioteca/catalogo-estampas", "Estampas")}
        >
          Estampas
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn("rounded-b-none", visao === "combos" && "border-b-2 border-primary text-foreground")}
          onClick={() => setVisao("combos")}
          {...arrastavel("/biblioteca/catalogo-estampas?visao=combos", "Combos de cores")}
        >
          Combos de cores
        </Button>
      </div>
      {visao === "combos" ? <PainelCombos editavel={editavel} destaque={comboInicial} /> : (
        <>
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar estampa" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-9 max-w-xs" />
        {editavel ? (
          <div className="ml-auto flex gap-1">
            <Button variant="outline" className="gap-1" onClick={() => void novaCategoria()}><FolderPlus className="size-4" /> Nova categoria</Button>
            <Input placeholder="Nome da estampa nova" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void criar()} className="h-9 w-56" />
            <Button onClick={() => void criar()} className="gap-1"><Plus className="size-4" /> Criar estampa</Button>
          </div>
        ) : null}
      </div>
      {grupos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma estampa ainda.</p> : null}
      {grupos.map((g) => (
        <div key={g.id ?? "sem"}>
          <p className="mb-1 text-lg font-semibold uppercase tracking-wide text-muted-foreground">
            {g.nome} <span className="opacity-70">· {g.itens.length}</span>
          </p>
          <div
            className="flex flex-wrap gap-1.5 rounded-lg p-1"
            style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 38px, var(--muted) 38px, var(--muted) 76px)" }}
          >
            {g.itens.map((e) => (
              <button
                key={e.id}
                type="button"
                {...arrastavelEstampa(e.id, e.nome)}
                title={`${e.nome}, ${e.n_papeis} ${e.n_papeis === 1 ? "cor" : "cores"}, ${e.n_modelos * e.n_cores} produtos — arraste até a barra de atalhos para fixar`}
                onClick={() => void navigate({ to: "/biblioteca/catalogo-estampas", search: { id: e.id } })}
                className={cn(
                  "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 text-left text-sm transition hover:border-primary",
                  e.situacao === "descontinuado" && "opacity-50",
                )}
              >
                <span className="text-base font-medium leading-none">{e.nome}</span>
                {e.tipo === "cromia" ? <span className="text-[10px] font-medium text-muted-foreground">CROMIA</span> : null}
                <span className="text-xs tabular-nums text-muted-foreground">{e.n_modelos * e.n_cores}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  );
}

// ---------------- Ficha ----------------

function Ficha({ id, editavel }: { id: string; editavel: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const opts = estampaQueryOptions(id);
  const K = opts.queryKey;
  const { data: est } = useQuery(opts);
  const { data: produtos = [] } = useQuery(produtosQueryOptions);
  const { data: cores = [] } = useQuery(coresQueryOptions);
  const { data: categorias = [] } = useQuery(categoriasEstampaQueryOptions);
  const { data: combos = [] } = useQuery(combosQueryOptions);
  const { porCodigo } = useCoresEstampa();
  const [avisos, setAvisos] = useState<Record<string, string>>({});
  const [tamCard, setTamCard] = useState<TamanhoCard>("m");
  useEffect(() => {
    const t = localStorage.getItem("juff:receitas:tamanho");
    if (t === "p" || t === "m" || t === "g") setTamCard(t);
  }, []);
  function mudarTamCard(t: TamanhoCard) {
    setTamCard(t);
    localStorage.setItem("juff:receitas:tamanho", t);
  }
  const caminhos = [est?.imagem_caminho, est?.ficha_caminho].filter(Boolean) as string[];
  const { data: urls = {} } = useQuery(urlsEstampaQueryOptions(caminhos));
  const imgRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  if (!est) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const e = est;
  const n = e.papeis.length;
  const corPorId = new Map(cores.map((c) => [c.id, c]));

  /** Muda a tela na hora e volta atrás se a gravação falhar. */
  function otimista(muda: (x: EstampaCompleta) => EstampaCompleta, grava: () => Promise<unknown>, depois?: () => void) {
    const antes = qc.getQueryData<EstampaCompleta>(K);
    qc.setQueryData<EstampaCompleta>(K, (x) => (x ? muda(x) : x));
    grava()
      .then(() => depois?.())
      .catch((err: Error) => {
        qc.setQueryData(K, antes);
        toast.error(`Não foi possível gravar: ${err.message}`);
      });
  }

  function patchEstampa(p: Parameters<typeof salvarEstampa>[1]) {
    otimista((x) => ({ ...x, ...p }), () => salvarEstampa(id, p), () => void qc.invalidateQueries({ queryKey: K_LISTA }));
  }

  async function enviar(tipo: "imagem" | "ficha", f: File | undefined) {
    if (!f) return;
    try {
      const caminho = await enviarArquivoEstampa(id, tipo, f);
      patchEstampa(tipo === "imagem" ? { imagem_caminho: caminho } : { ficha_caminho: caminho });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  // ---- Papéis ----
  function mudarPapeis(nomes: string[]) {
    if (nomes.length < n) {
      const perdem = e.receitas.filter((r) => r.itens.length > nomes.length).length;
      if (perdem && !confirm(`${perdem} receita(s) perdem a última cor. Continuar?`)) return;
    }
    const corta = nomes.length < n;
    otimista(
      (x) => ({
        ...x,
        papeis: nomes.map((nome, i) => ({ id: x.papeis[i]?.id ?? `tmp${i}`, ordem: i + 1, nome })),
        receitas: corta ? x.receitas.map((r) => ({ ...r, combo_id: r.itens.length > nomes.length ? null : r.combo_id, itens: r.itens.slice(0, nomes.length) })) : x.receitas,
      }),
      async () => {
        await definirPapeis(id, e.papeis, nomes);
        if (corta) {
          const ids = e.receitas.filter((r) => r.itens.length > nomes.length).map((r) => r.id);
          if (ids.length) {
            const a = await supabase.from("biblioteca_estampa_receita_itens").delete().in("receita_id", ids).gt("ordem", nomes.length);
            if (a.error) throw a.error;
            const b = await supabase.from("biblioteca_estampa_receitas").update({ combo_id: null }).in("id", ids);
            if (b.error) throw b.error;
          }
        }
      },
      () => {
        void qc.invalidateQueries({ queryKey: K });
        void qc.invalidateQueries({ queryKey: K_LISTA });
      },
    );
  }

  // ---- Modelos e grupos ----
  const grupoDoModelo = (pid: string) => e.grupos.find((g) => g.modelos.includes(pid));
  function alternarModelo(p: ProdutoBiblioteca) {
    const atual = grupoDoModelo(p.id);
    let destino: Grupo | undefined;
    if (!atual) {
      const rot = ROTULO_GENERO[generoDoProduto(p)].toLowerCase();
      destino = e.grupos.find((g) => g.nome.toLowerCase() === rot) ?? e.grupos[0];
      if (!destino) { toast.error("Crie um grupo primeiro."); return; }
    }
    mover(p.id, destino?.id ?? null);
  }
  function mover(pid: string, grupoId: string | null) {
    otimista(
      (x) => ({ ...x, grupos: x.grupos.map((g) => ({ ...g, modelos: g.id === grupoId ? [...g.modelos.filter((m) => m !== pid), pid] : g.modelos.filter((m) => m !== pid) })) }),
      () => moverModelo(id, grupoId, pid),
      () => void qc.invalidateQueries({ queryKey: K_LISTA }),
    );
  }
  async function novoGrupo(nome: string, modelo?: string) {
    try {
      const gid = await criarGrupo(id, nome, e.grupos.length);
      if (modelo) await moverModelo(id, gid, modelo);
      void qc.invalidateQueries({ queryKey: K });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  function removerGrupo(g: Grupo) {
    if (!confirm(`Apagar o grupo ${g.nome}? Os modelos e receitas dele saem da estampa.`)) return;
    otimista((x) => ({ ...x, grupos: x.grupos.filter((y) => y.id !== g.id), receitas: x.receitas.filter((r) => r.grupo_id !== g.id) }), () => apagarGrupo(g.id), () => void qc.invalidateQueries({ queryKey: K_LISTA }));
  }

  // ---- Cores de camiseta ----
  function mudarCoresGrupo(gid: string, lista: string[]) {
    const g = e.grupos.find((x) => x.id === gid);
    if (!g) return;
    otimista(
      (x) => ({ ...x, grupos: x.grupos.map((y) => (y.id === gid ? { ...y, cores: lista } : y)) }),
      () => definirCoresGrupo(gid, g.cores, lista),
      () => void qc.invalidateQueries({ queryKey: K_LISTA }),
    );
  }

  function mudarCores(lista: string[]) {
    otimista((x) => ({ ...x, cores: lista }), () => definirCoresCamiseta(id, e.cores, lista), () => void qc.invalidateQueries({ queryKey: K_LISTA }));
  }

  // ---- Receitas ----
  const receitaDe = (gid: string, cid: string) => e.receitas.find((r) => r.grupo_id === gid && r.cor_id === cid);
  const chave = (gid: string, cid: string) => `${gid}:${cid}`;

  function gravarReceita(gid: string, cid: string, comboId: string | null, itens: ItemCor[]) {
    const r = receitaDe(gid, cid);
    otimista(
      (x) => ({
        ...x,
        receitas: r
          ? x.receitas.map((y) => (y.id === r.id ? { ...y, combo_id: comboId, itens } : y))
          : [...x.receitas, { id: `tmp-${gid}-${cid}`, grupo_id: gid, cor_id: cid, combo_id: comboId, publico: null, itens }],
      }),
      () => salvarReceita(id, gid, cid, comboId, itens),
      () => {
        void qc.invalidateQueries({ queryKey: K });
        void qc.invalidateQueries({ queryKey: K_COMBOS });
      },
    );
  }

  function trocarCor(gid: string, cid: string, ordem: number, cor: { codigo: string; c: number; m: number; y: number; k: number }) {
    const atual = receitaDe(gid, cid)?.itens ?? [];
    const itens: ItemCor[] = Array.from({ length: n }, (_, i) => atual[i] ?? { codigo: "", c: 0, m: 0, y: 0, k: 0 });
    itens[ordem] = { codigo: cor.codigo, c: cor.c, m: cor.m, y: cor.y, k: cor.k };
    setAvisos((a) => ({ ...a, [chave(gid, cid)]: "" }));
    gravarReceita(gid, cid, null, itens);
  }

  function candidatos(g: Grupo, cid: string): Combo[] {
    const gen = generoDoGrupo(g.modelos, produtos);
    return combos.filter((c) => c.genero === gen && c.cor_id === cid && c.itens.length === n);
  }

  function aplicarCombo(g: Grupo, cid: string, c: Combo) {
    const outras = c.estampas.filter((x) => x !== e.nome);
    setAvisos((a) => ({ ...a, [chave(g.id, cid)]: outras.length ? `Já usado em ${outras.join(", ")}` : "" }));
    gravarReceita(g.id, cid, c.id, c.itens);
  }

  function sortear(g: Grupo, cid: string, silencioso = false) {
    const atual = receitaDe(g.id, cid)?.combo_id;
    const lista = candidatos(g, cid);
    const opcoes = lista.length > 1 ? lista.filter((c) => c.id !== atual) : lista;
    if (!opcoes.length) {
      if (!silencioso) toast.info("Nenhum combo do catálogo serve para esta célula.");
      return false;
    }
    aplicarCombo(g, cid, opcoes[Math.floor(Math.random() * opcoes.length)]!);
    return true;
  }

  function sortearVazias() {
    let feitas = 0;
    for (const g of e.grupos) for (const cid of g.cores) if (!receitaDe(g.id, cid) && sortear(g, cid, true)) feitas++;
    toast.success(feitas ? `${feitas} células preenchidas` : "Nenhuma célula vazia com combo disponível.");
  }

  async function salvarCombo(g: Grupo, cid: string, r: Receita) {
    try {
      const gen = generoDoGrupo(g.modelos, produtos) ?? "unissex";
      const res = await registrarCombo(gen, cid, r.itens);
      gravarReceita(g.id, cid, res.id, r.itens);
      toast.success(res.criado ? `Combo ${res.codigo} criado` : `Já existia como ${res.codigo}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function limparReceita(gid: string, cid: string) {
    const r = receitaDe(gid, cid);
    if (!r) return;
    setAvisos((a) => ({ ...a, [chave(gid, cid)]: "" }));
    otimista(
      (x) => ({ ...x, receitas: x.receitas.filter((y) => y.id !== r.id) }),
      () => apagarReceita(r.id),
      () => {
        void qc.invalidateQueries({ queryKey: K });
        void qc.invalidateQueries({ queryKey: K_COMBOS });
      },
    );
  }

  function mudarPublico(gid: string, cid: string, p: Receita["publico"]) {
    const r = receitaDe(gid, cid);
    if (!r) return;
    otimista(
      (x) => ({ ...x, receitas: x.receitas.map((y) => (y.id === r.id ? { ...y, publico: p } : y)) }),
      () => salvarPublicoReceita(r.id, p),
    );
  }

  function copiarGrupo(origem: string, destino: string) {
    const gOrig = e.grupos.find((g) => g.id === origem);
    const gDest = e.grupos.find((g) => g.id === destino);
    if (!gOrig || !gDest) return;
    const genDest = generoDoGrupo(gDest.modelos, produtos);
    mudarCoresGrupo(destino, Array.from(new Set([...gDest.cores, ...gOrig.cores])));
    for (const cid of gOrig.cores) {
      const r = receitaDe(origem, cid);
      if (!r) continue;
      const combo = combos.find((c) => c.id === r.combo_id);
      gravarReceita(destino, cid, combo && combo.genero === genDest ? combo.id : null, r.itens);
    }
  }

  // ---- Exportação ----
  const totalProdutos = e.grupos.reduce((s, g) => s + g.modelos.length * g.cores.length, 0);
  async function exportar() {
    const cat = categorias.find((c) => c.id === e.categoria_id)?.nome ?? "";
    const cab = ["Nome do produto", "Modelo", "Cor da camiseta", "Estampa", "Categoria", ...e.papeis.flatMap((p) => [`${p.nome || `Cor ${p.ordem}`} código`, `${p.nome || `Cor ${p.ordem}`} CMYK`])];
    const linhas: (string | number | null)[][] = [cab];
    for (const g of e.grupos)
      for (const pid of g.modelos) {
        const p = produtos.find((x) => x.id === pid);
        if (!p) continue;
        for (const cid of g.cores) {
          const cor = corPorId.get(cid);
          if (!cor) continue;
          const r = receitaDe(g.id, cid);
          linhas.push([
            nomeProdutoEstampa(p, e.nome, cor),
            p.usa_sufixo && p.sufixo ? `${p.nome_base} ${p.sufixo}` : p.nome_base,
            cor.nome_olist,
            e.nome,
            cat,
            ...e.papeis.flatMap((_, i) => {
              const it = r?.itens[i];
              return it?.codigo ? [it.codigo, textoCmykItem(it)] : ["", ""];
            }),
          ]);
        }
      }
    await baixarXlsx(`Estampa ${e.nome}`, [{ nome: e.nome, linhas }]);
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => void navigate({ to: "/biblioteca/catalogo-estampas", search: {} })}>
        <ArrowLeft className="size-4" /> Todas as estampas
      </Button>

      <Bloco titulo="Ficha da estampa" acoes={editavel ? (
        <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => {
          if (!confirm(`Apagar a estampa ${e.nome}?`)) return;
          apagarEstampa(id).then(() => { void qc.invalidateQueries({ queryKey: K_LISTA }); void navigate({ to: "/biblioteca/catalogo-estampas", search: {} }); }).catch((err: Error) => toast.error(err.message));
        }}><Trash2 className="size-4" /> Apagar</Button>
      ) : undefined}>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="w-full shrink-0 md:w-48">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {e.imagem_caminho && urls[e.imagem_caminho] ? <img src={urls[e.imagem_caminho]} alt={e.nome} className="size-full object-contain" /> : <ImagePlus className="size-8 text-muted-foreground" />}
            </div>
            {editavel ? (
              <>
                <input ref={imgRef} type="file" accept="image/*" hidden onChange={(ev) => void enviar("imagem", ev.target.files?.[0])} />
                <Button variant="outline" size="sm" className="mt-2 w-full gap-1" onClick={() => imgRef.current?.click()}><ImagePlus className="size-4" /> Imagem</Button>
              </>
            ) : null}
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">Nome
              <CampoAutoSave valor={e.nome} disabled={!editavel} className="text-base font-semibold" onSalvar={(v) => v.trim() && patchEstampa({ nome: v.trim() })} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">Categoria
              <select
                disabled={!editavel}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={e.categoria_id ?? ""}
                onChange={async (ev) => {
                  let v: string | null = ev.target.value || null;
                  if (v === "__nova") {
                    const nome = prompt("Nome da categoria nova");
                    if (!nome?.trim()) return;
                    try { v = await criarCategoria(nome, categorias.length); void qc.invalidateQueries({ queryKey: categoriasEstampaQueryOptions.queryKey }); }
                    catch (err) { toast.error((err as Error).message); return; }
                  }
                  patchEstampa({ categoria_id: v });
                }}
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                <option value="__nova">+ Nova categoria</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">Situação
              <select disabled={!editavel} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={e.situacao} onChange={(ev) => patchEstampa({ situacao: ev.target.value as "ativo" | "descontinuado" })}>
                <option value="ativo">Ativa</option>
                <option value="descontinuado">Descontinuada</option>
              </select>
            </label>
            <div className="space-y-1 text-xs text-muted-foreground">Ficha técnica
              <div className="flex gap-1">
                {e.ficha_caminho && urls[e.ficha_caminho] ? (
                  <Button asChild variant="outline" size="sm" className="gap-1"><a href={urls[e.ficha_caminho]} target="_blank" rel="noreferrer"><FileText className="size-4" /> Abrir PDF</a></Button>
                ) : <span className="py-2 text-sm">Sem PDF</span>}
                {editavel ? (
                  <>
                    <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(ev) => void enviar("ficha", ev.target.files?.[0])} />
                    <Button variant="ghost" size="sm" onClick={() => pdfRef.current?.click()}>Enviar</Button>
                  </>
                ) : null}
              </div>
            </div>
            {(["tamanho_adulto", "tamanho_feminino", "tamanho_infantil"] as const).map((k) => (
              <label key={k} className="space-y-1 text-xs text-muted-foreground">Tamanho {k.split("_")[1]}
                <CampoAutoSave valor={e[k]} disabled={!editavel} placeholder="25 x 18 cm" onSalvar={(v) => patchEstampa({ [k]: v.trim() })} />
              </label>
            ))}
          </div>
        </div>
      </Bloco>

      <Bloco titulo={`Cores da estampa · ${n}`} acoes={editavel ? (
        <div className="flex gap-1">
          {n > 1 ? <Button variant="ghost" size="sm" onClick={() => mudarPapeis(e.papeis.slice(0, -1).map((p) => p.nome))}>Tirar a última</Button> : null}
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => mudarPapeis([...e.papeis.map((p) => p.nome), `Cor ${n + 1}`])}><Plus className="size-4" /> Acrescentar cor</Button>
        </div>
      ) : undefined}>
        <div className="flex flex-wrap gap-2">
          {e.papeis.map((p, i) => (
            <label key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">{i + 1}</span>
              <CampoAutoSave valor={p.nome} disabled={!editavel} placeholder="bola, texto…" className="h-8 w-36" onSalvar={(v) => mudarPapeis(e.papeis.map((x, j) => (j === i ? v.trim() : x.nome)))} />
            </label>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Modelos e grupos" acoes={editavel ? <Button variant="ghost" size="sm" className="gap-1" onClick={() => void novoGrupo("Grupo")}><Plus className="size-4" /> Grupo</Button> : undefined}>
        <div className="mb-4 flex flex-wrap gap-1">
          {produtos.filter((p) => p.ativo).map((p) => {
            const ligado = !!grupoDoModelo(p.id);
            return (
              <button key={p.id} type="button" disabled={!editavel} onClick={() => alternarModelo(p)}
                className={cn("rounded-full border px-3 py-1 text-xs transition", ligado ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary")}>
                {p.usa_sufixo && p.sufixo ? `${p.nome_base} ${p.sufixo}` : p.nome_base}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {e.grupos.map((g) => {
            const gen = generoDoGrupo(g.modelos, produtos);
            return (
              <div key={g.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center gap-1">
                  <CampoAutoSave valor={g.nome} disabled={!editavel} className="h-8 font-medium" onSalvar={(v) => v.trim() && otimista((x) => ({ ...x, grupos: x.grupos.map((y) => (y.id === g.id ? { ...y, nome: v.trim() } : y)) }), () => salvarGrupo(g.id, { nome: v.trim() }))} />
                  {editavel ? <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => removerGrupo(g)}><Trash2 className="size-4" /></Button> : null}
                </div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{gen ? ROTULO_GENERO[gen] : "Sem modelos"}</div>
                <ul className="space-y-1">
                  {g.modelos.map((pid) => {
                    const p = produtos.find((x) => x.id === pid);
                    if (!p) return null;
                    return (
                      <li key={pid}>
                        <Popover>
                          <PopoverTrigger asChild disabled={!editavel}>
                            <button type="button" className="w-full rounded px-2 py-1 text-left text-sm hover:bg-secondary">{p.usa_sufixo && p.sufixo ? `${p.nome_base} ${p.sufixo}` : p.nome_base}</button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-1">
                            {e.grupos.filter((o) => o.id !== g.id).map((o) => (
                              <button key={o.id} type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-secondary" onClick={() => mover(pid, o.id)}>Mover para {o.nome}</button>
                            ))}
                            <button type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-secondary" onClick={() => void novoGrupo(p.nome_base, pid)}>Separar num grupo novo</button>
                            <button type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-secondary" onClick={() => mover(pid, null)}>Tirar da estampa</button>
                          </PopoverContent>
                        </Popover>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Bloco>

      <Bloco titulo="Receitas" acoes={editavel ? (
        <div className="flex flex-wrap gap-1">
          <div className="flex rounded-md border border-border p-0.5">
            {(["p", "m", "g"] as const).map((t) => (
              <button key={t} type="button" className={cn("rounded px-2 py-1 text-xs uppercase", tamCard === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")} onClick={() => mudarTamCard(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-border p-0.5">
            {(["codigo", "cromia"] as const).map((t) => (
              <button key={t} type="button" className={cn("rounded px-2 py-1 text-xs", e.tipo === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")} onClick={() => e.tipo !== t && otimista((x) => ({ ...x, tipo: t }), () => salvarTipoEstampa(id, t), () => void qc.invalidateQueries({ queryKey: K_LISTA }))}>
                {t === "codigo" ? "Código" : "Cromia"}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="gap-1" onClick={sortearVazias}><Sparkles className="size-4" /> Sortear vazias</Button>
          <CopiarGrupo grupos={e.grupos} onCopiar={copiarGrupo} />
        </div>
      ) : undefined}>
        {e.tipo === "cromia" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Estampa em cromia, não usa receita de código.</p>
            <div className="flex flex-wrap gap-2">
              {e.cores.map((cid) => { const cor = corPorId.get(cid); return cor ? <span key={cid} className="flex items-center gap-1 text-sm capitalize"><Bolinha hex={cor.hex} /> {cor.nome}</span> : null; })}
            </div>
          </div>
        ) : (
        <div className="space-y-5">
          {e.grupos.map((g) => {
            const gen = generoDoGrupo(g.modelos, produtos);
            const infantil = gen === "infantil";
            const linha = g.cores
              .map((cid) => ({ cid, cor: corPorId.get(cid), rec: receitaDe(g.id, cid) }))
              .filter((x) => x.cor);
            const temMarca = infantil && linha.some((x) => x.rec?.publico);
            const fileiras = temMarca
              ? [
                  linha.filter((x) => x.rec?.publico === "menino"),
                  linha.filter((x) => x.rec?.publico === "menina"),
                  linha.filter((x) => !x.rec?.publico),
                ].filter((f) => f.length)
              : [linha];
            const livres = cores.filter((c) => c.ativo && !g.cores.includes(c.id));
        
            return (
              <div key={g.id}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {g.nome} {gen ? <span className="font-normal opacity-70">{ROTULO_GENERO[gen]}</span> : null}
                </p>
                {editavel ? (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {g.cores.map((cid) => {
                      const cor = corPorId.get(cid);
                      if (!cor) return null;
                      return (
                        <span key={cid} className="flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-2 pr-1 text-xs capitalize">
                          <Bolinha hex={cor.hex} /> {cor.nome}
                          <button type="button" className="text-muted-foreground hover:text-destructive" title="Tirar esta cor deste grupo" onClick={() => mudarCoresGrupo(g.id, g.cores.filter((x) => x !== cid))}>
                            <Trash2 className="size-3" />
                          </button>
                        </span>
                      );
                    })}
                    {livres.length ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/50 px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                            <Plus className="size-3" /> Cor
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="max-h-80 w-60 overflow-y-auto p-1">
                          {livres.map((c) => (
                            <button key={c.id} type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm capitalize hover:bg-secondary" onClick={() => mudarCoresGrupo(g.id, [...g.cores, c.id])}>
                              <Bolinha hex={c.hex} /> {c.nome}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  {fileiras.map((fileira, fi) => (
                    <div key={fi} className="flex flex-wrap gap-1.5">
                      {fileira.map(({ cid, cor, rec }) => {
                        const itens: ItemCor[] = Array.from({ length: n }, (_, i) => rec?.itens[i] ?? { codigo: "", c: 0, m: 0, y: 0, k: 0 });
                        const combo = combos.find((c) => c.id === rec?.combo_id);
                        const completa = itens.every((i) => i.codigo);
                        return (
                          <CardReceita
                            key={cid}
                            fundo={cor!.hex}
                            nomeCor={cor!.nome}
                            itens={itens}
                            porCodigo={porCodigo}
                            codigo={combo ? combo.codigo : null}
                            cromia={combo?.codigo === "CROMIA"}
                            temReceita={!!rec}
                            tamanho={tamCard}
                            editavel={editavel}
                            aviso={avisos[chave(g.id, cid)]}
                            infantil={infantil}
                            publico={rec?.publico ?? null}
                            podeSalvar={!!rec && !combo && completa}
                            onTrocar={(ordem, c) => trocarCor(g.id, cid, ordem, c)}
                            seletorCombo={<SeletorCombo combos={combos} porCodigo={porCodigo} genero={gen} nCores={n} atual={rec?.combo_id ?? null} onEscolher={(c) => aplicarCombo(g, cid, c)} />}
                            onSortear={() => sortear(g, cid)}
                            onSalvar={() => { if (rec) void salvarCombo(g, cid, { ...rec, itens }); }}
                            onLimpar={() => limparReceita(g.id, cid)}
                            onPublico={(p) => mudarPublico(g.id, cid, p)}
                          />
                        );
                      })}
                    </div>
                  ))}
                  {!linha.length ? <p className="text-xs text-muted-foreground">Nenhuma cor de camiseta neste grupo.</p> : null}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </Bloco>

      <Bloco titulo={`Produtos gerados · ${totalProdutos}`} acoes={<Button size="sm" variant="outline" className="gap-1" onClick={() => void exportar()}><Download className="size-4" /> Exportar planilha</Button>}>
        <p className="text-xs text-muted-foreground">Uma linha por modelo e cor de camiseta, com código e CMYK de cada cor da estampa.</p>
      </Bloco>
    </div>
  );
}

function AcrescentarCor({ cores, usadas, onEscolher }: { cores: CorBiblioteca[]; usadas: string[]; onEscolher: (id: string) => void }) {
  const livres = cores.filter((c) => c.ativo && !usadas.includes(c.id));
  if (!livres.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" className="mt-2 gap-1 text-muted-foreground"><Plus className="size-4" /> Acrescentar cor de camiseta</Button></PopoverTrigger>
      <PopoverContent className="max-h-80 w-60 overflow-y-auto p-1">
        {livres.map((c) => (
          <button key={c.id} type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm capitalize hover:bg-secondary" onClick={() => onEscolher(c.id)}>
            <Bolinha hex={c.hex} /> {c.nome}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Popover para puxar um combo CB existente direto para a célula. */
function SeletorCombo({ combos, porCodigo, genero, nCores, atual, onEscolher }: {
  combos: Combo[];
  porCodigo: Map<string, CorEstampa>;
  genero: ReturnType<typeof generoDoGrupo>;
  nCores: number;
  atual: string | null;
  onEscolher: (c: Combo) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const cromia = combos.filter((c) => c.codigo === "CROMIA");
    const normais = combos
      // Ao digitar um código, busca em todos; sem busca, sugere só os compatíveis.
      .filter((c) => c.codigo !== "CROMIA" && (termo ? true : c.genero === genero && (nCores === 0 || c.itens.length === nCores)))
      .filter((c) => !termo || c.codigo.toLowerCase().includes(termo));
    const especiais = cromia.filter((c) => !termo || "cromia".includes(termo));
    return [...especiais, ...normais].slice(0, 60);
  }, [combos, genero, nCores, busca]);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button type="button" title="Puxar combo da lista" className="rounded px-1 py-0.5 text-[10px] font-bold leading-none hover:bg-white/20">CB</button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <Input autoFocus value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder="Buscar CB…" className="mb-1 h-8" />
        <div className="max-h-72 overflow-y-auto">
          {lista.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-secondary", c.id === atual && "bg-secondary")}
              onClick={() => { onEscolher(c); setAberto(false); setBusca(""); }}
            >
              <span className="flex -space-x-1">
                {c.itens.slice(0, 6).map((it, i) => (
                  <span key={i} className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: porCodigo.get(it.codigo.toUpperCase())?.hex ?? "#888888" }} />
                ))}
              </span>
              <span className="font-medium">{c.codigo}</span>
              {c.uso ? <span className="ml-auto text-xs text-muted-foreground">{c.uso}×</span> : null}
            </button>
          ))}
          {!lista.length ? <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum combo encontrado.</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CopiarGrupo({ grupos, onCopiar }: { grupos: Grupo[]; onCopiar: (o: string, d: string) => void }) {
  const [o, setO] = useState("");
  const [d, setD] = useState("");
  const pronto = useMemo(() => o && d && o !== d, [o, d]);
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" className="gap-1"><Copy className="size-4" /> Copiar receita</Button></PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        {[["De", o, setO], ["Para", d, setD]].map(([rot, v, set]) => (
          <label key={rot as string} className="block space-y-1 text-xs text-muted-foreground">{rot as string}
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={v as string} onChange={(ev) => (set as (s: string) => void)(ev.target.value)}>
              <option value="">Escolha</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </label>
        ))}
        <Button size="sm" disabled={!pronto} onClick={() => onCopiar(o, d)}>Copiar</Button>
      </PopoverContent>
    </Popover>
  );
}
