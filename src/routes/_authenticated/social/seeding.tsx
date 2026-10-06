import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RotateCcw,
  Scissors,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SemAcesso } from "@/components/biblioteca/comum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { coresQueryOptions, nomePai, ordenarTamanhos, ORDEM_TAMANHOS, produtosQueryOptions, type ProdutoBiblioteca } from "@/lib/biblioteca";
import {
  MARCAS,
  MOTIVOS,
  alterarPeca,
  apagarRemessa,
  criarPeca,
  criarRemessa,
  custoDoMes,
  custosQueryOptions,
  duplicarPeca,
  estampasSimplesQueryOptions,
  marcarColuna,
  mesAtualIso,
  nomeMes,
  painelQueryOptions,
  pessoasQueryOptions,
  reais,
  remessasQueryOptions,
  somarMeses,
  type Marca,
  type Peca,
  type Remessa,
} from "@/lib/seeding";

export const Route = createFileRoute("/_authenticated/social/seeding")({
  head: () => ({
    meta: [
      { title: "Seeding — Social — Marketing Juff" },
      { name: "description", content: "Controle de saída de peças: remessas, pessoas, envio, captação e devolução." },
      { property: "og:title", content: "Seeding — Social — Marketing Juff" },
      { property: "og:description", content: "Controle de saída de peças: remessas, pessoas, envio, captação e devolução." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeedingPage,
});

const ICONES: Record<Marca, { Icone: ComponentType<{ className?: string }>; texto: string; rotulo: string }> = {
  pedido: { Icone: ShoppingCart, texto: "Pedido no site", rotulo: "Pedido" },
  produzida: { Icone: Scissors, texto: "Produzida", rotulo: "Produzida" },
  enviada: { Icone: Truck, texto: "Enviada", rotulo: "Enviada" },
  captada: { Icone: Camera, texto: "Captada", rotulo: "Captada" },
  retorna: { Icone: RotateCcw, texto: "Precisa voltar", rotulo: "Precisa voltar" },
  devolvida: { Icone: PackageCheck, texto: "Devolvida", rotulo: "Devolvida" },
};

const GRID = "grid grid-cols-[minmax(9rem,1.6fr)_minmax(8rem,1.4fr)_minmax(7rem,1fr)_4.5rem_minmax(8rem,1.2fr)_repeat(6,1.9rem)_minmax(8rem,1.6fr)_1.9rem] items-center gap-x-3";

function SeedingPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "social.seeding");
  const editavel = canEdit(profile, "social.seeding");
  const atual = mesAtualIso();
  const [de, setDe] = useState(atual);
  const [ate, setAte] = useState(somarMeses(atual, 1));

  const { data: remessas = [] } = useQuery({ ...remessasQueryOptions(de, ate), enabled: pode });
  const { data: painel } = useQuery({ ...painelQueryOptions(de, ate), enabled: pode });
  const { data: custos = [] } = useQuery({ ...custosQueryOptions, enabled: pode });
  const [novaAberta, setNovaAberta] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);

  if (!pode) return <AppShell><SemAcesso /></AppShell>;

  function andar(n: number) {
    setDe(somarMeses(de, n));
    setAte(somarMeses(ate, n));
  }

  const pessoas = painel?.pessoas ?? [];
  const periodo = de === ate ? nomeMes(de) : `${nomeMes(de)} – ${nomeMes(ate)}`;

  return (
    <AppShell largura="ampla">
      {!editavel ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Você está em modo de consulta. Pode ver, copiar e baixar, mas não alterar.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cartao titulo="Peças no período" numero={painel?.total ?? 0} rodape={reais(painel?.custo ?? 0)} />
        <Cartao titulo="Aguardando captação" numero={painel?.aguardando ?? 0} />
        <Cartao titulo="A devolver" numero={painel?.a_devolver ?? 0} rodape={`${painel?.retorna ?? 0} precisam voltar no total`} />
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="text-xs font-medium text-muted-foreground">Na mão de</div>
          {pessoas.length === 0 ? (
            <div className="mt-2 text-[13px] text-muted-foreground">Ninguém com peça em aberto.</div>
          ) : (
            <ul className="mt-2 space-y-0.5 text-[13px]">
              {pessoas.slice(0, 4).map((p) => (
                <li key={p.pessoa} className="flex justify-between gap-2">
                  <span className="truncate">{p.pessoa}</span>
                  <span className="tabular-nums text-muted-foreground">{p.qtd}</span>
                </li>
              ))}
              {pessoas.length > 4 ? (
                <li className="text-muted-foreground">e mais {pessoas.length - 4} {pessoas.length - 4 === 1 ? "pessoa" : "pessoas"}</li>
              ) : null}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => andar(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">{periodo}</span>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => andar(1)}>
          <ChevronRight className="size-4" />
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Custo do mês: {reais(custoDoMes(custos, atual))}</span>
          <FiltroPeriodo de={de} ate={ate} onAplicar={(a, b) => { setDe(a); setAte(b); }} onPadrao={() => { setDe(atual); setAte(somarMeses(atual, 1)); }} />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {remessas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma remessa neste período.
          </p>
        ) : null}
        {remessas.map((r) => (
          <BlocoRemessa key={r.id} remessa={r} de={de} ate={ate} atual={atual} custo={custoDoMes(custos, r.mes)} editavel={editavel} focoInicial={foco === r.id} />
        ))}
      </div>

      {editavel ? (
        <Button variant="outline" className="mt-4 gap-2" onClick={() => setNovaAberta(true)}>
          <Plus className="size-4" /> Nova remessa
        </Button>
      ) : null}

      <NovaRemessa
        aberta={novaAberta}
        onFechar={() => setNovaAberta(false)}
        remessas={remessas}
        padrao={atual}
        onCriada={(id, mes) => {
          if (mes < de) setDe(mes);
          if (mes > ate) setAte(mes);
          setFoco(id);
          setTimeout(() => document.getElementById(`remessa-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
        }}
        de={de}
        ate={ate}
      />
    </AppShell>
  );
}

function Cartao({ titulo, numero, rodape }: { titulo: string; numero: number; rodape?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="text-xs font-medium text-muted-foreground">{titulo}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{numero}</div>
      {rodape ? <div className="mt-0.5 text-xs text-muted-foreground">{rodape}</div> : null}
    </div>
  );
}

function FiltroPeriodo({ de, ate, onAplicar, onPadrao }: { de: string; ate: string; onAplicar: (a: string, b: string) => void; onPadrao: () => void }) {
  const [a, setA] = useState(de.slice(0, 7));
  const [b, setB] = useState(ate.slice(0, 7));
  const [aberto, setAberto] = useState(false);
  useEffect(() => { setA(de.slice(0, 7)); setB(ate.slice(0, 7)); }, [de, ate]);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Filter className="size-3.5" /> Período</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <label className="block text-xs text-muted-foreground">Mês inicial
          <Input type="month" value={a} onChange={(e) => setA(e.target.value)} className="mt-1" />
        </label>
        <label className="block text-xs text-muted-foreground">Mês final
          <Input type="month" value={b} onChange={(e) => setB(e.target.value)} className="mt-1" />
        </label>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => { onPadrao(); setAberto(false); }}>Voltar ao padrão</Button>
          <Button size="sm" disabled={!a || !b} onClick={() => {
            const x = `${a}-01`, y = `${b}-01`;
            onAplicar(x <= y ? x : y, x <= y ? y : x);
            setAberto(false);
          }}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NovaRemessa({ aberta, onFechar, remessas, padrao, onCriada, de, ate }: {
  aberta: boolean; onFechar: () => void; remessas: Remessa[]; padrao: string; onCriada: (id: string, mes: string) => void; de: string; ate: string;
}) {
  const qc = useQueryClient();
  const [mes, setMes] = useState(padrao.slice(0, 7));
  const [motivo, setMotivo] = useState<string>("Captação");
  const [salvando, setSalvando] = useState(false);
  async function criar() {
    const iso = `${mes}-01`;
    const existente = remessas.find((r) => r.mes === iso && r.motivo === motivo);
    if (existente) {
      onFechar();
      onCriada(existente.id, iso);
      return;
    }
    setSalvando(true);
    const novoDe = iso < de ? iso : de, novoAte = iso > ate ? iso : ate;
    // Outra remessa igual fora do período visível?
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: ja } = await supabase.from("social_seeding_remessas").select("id").eq("mes", iso).eq("motivo", motivo).maybeSingle();
    if (ja) {
      setSalvando(false);
      onFechar();
      onCriada(ja.id, iso);
      return;
    }
    const id = await criarRemessa(qc, novoDe, novoAte, iso, motivo);
    setSalvando(false);
    if (id) {
      onFechar();
      onCriada(id, iso);
    }
  }
  const jaExiste = remessas.some((r) => r.mes === `${mes}-01` && r.motivo === motivo);
  return (
    <Dialog open={aberta} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Nova remessa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block text-xs text-muted-foreground">Mês
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-xs text-muted-foreground">Motivo
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
              {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          {jaExiste ? <p className="text-xs text-muted-foreground">Já existe uma remessa com este mês e motivo. Vou te levar até ela.</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button disabled={!mes || salvando} onClick={criar}>{jaExiste ? "Ir para a remessa" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlocoRemessa({ remessa: r, de, ate, atual, custo, editavel, focoInicial }: {
  remessa: Remessa; de: string; ate: string; atual: string; custo: number; editavel: boolean; focoInicial: boolean;
}) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(r.mes >= atual || focoInicial);
  const [confirmar, setConfirmar] = useState(false);
  const [focoTamanho, setFocoTamanho] = useState<string | null>(null);
  useEffect(() => { if (focoInicial) setAberto(true); }, [focoInicial]);

  return (
    <section id={`remessa-${r.id}`} className="rounded-xl border border-border bg-card shadow-soft">
      <header className="flex items-center gap-3 px-3 py-2">
        <button type="button" onClick={() => setAberto(!aberto)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !aberto && "-rotate-90")} />
          <span className="font-semibold">{nomeMes(r.mes)}</span>
          <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{r.motivo}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {r.pecas.length} {r.pecas.length === 1 ? "peça" : "peças"} · {reais(r.pecas.length * custo)}
          </span>
        </button>
        {editavel ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ações da remessa"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {MARCAS.map((m) => {
                const { Icone, rotulo } = ICONES[m];
                return (
                  <div key={m}>
                    <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground"><Icone className="size-3.5" /> {rotulo}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => void marcarColuna(qc, de, ate, r.id, m, true)}>Marcar todas</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void marcarColuna(qc, de, ate, r.id, m, false)}>Desmarcar todas</DropdownMenuItem>
                  </div>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setConfirmar(true)}>
                <Trash2 className="size-4" /> Apagar remessa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      {aberto ? (
        <div className="overflow-x-auto border-t border-border px-3 pb-2 text-[14px] leading-[1.35]">
          <div className="min-w-[68rem]">
            <div className={cn(GRID, "py-1.5 text-[11px] text-muted-foreground")}>
              <span>Modelo</span><span>Estampa</span><span>Cor</span><span>Tamanho</span><span>Pessoa</span>
              {MARCAS.map((m) => {
                const { Icone, texto } = ICONES[m];
                return <span key={m} title={texto} className="flex justify-center"><Icone className="size-3.5" /></span>;
              })}
              <span>Observação</span><span />
            </div>
            {r.pecas.map((p) => (
              <LinhaPeca
                key={p.id}
                peca={p}
                editavel={editavel}
                focarTamanho={focoTamanho === p.id}
                onSalvar={(patch) => void alterarPeca(qc, de, ate, p, patch)}
                onCopiar={async () => {
                  const id = await duplicarPeca(qc, de, ate, p);
                  if (id) setFocoTamanho(id);
                }}
              />
            ))}
            {editavel ? (
              <LinhaPeca
                key={`nova-${r.pecas.length}`}
                editavel
                onSalvar={(patch) => void criarPeca(qc, de, ate, r.id, patch)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar remessa?</AlertDialogTitle>
            <AlertDialogDescription>
              {nomeMes(r.mes)} · {r.motivo}. {r.pecas.length > 0 ? `${r.pecas.length} ${r.pecas.length === 1 ? "peça será apagada" : "peças serão apagadas"} junto.` : "Ela não tem peças."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void apagarRemessa(qc, de, ate, r.id)}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function tamanhosDoProduto(p: ProdutoBiblioteca | undefined): string[] {
  if (!p) return [...ORDEM_TAMANHOS];
  const lista = [...p.tamanhos, ...(p.usa_xtra ? p.tamanhos_xtra : [])];
  return lista.length ? ordenarTamanhos(Array.from(new Set(lista))) : [...ORDEM_TAMANHOS];
}

function LinhaPeca({ peca, editavel, onSalvar, onCopiar, focarTamanho }: {
  peca?: Peca; editavel: boolean; onSalvar: (patch: Partial<Peca>) => void; onCopiar?: () => void; focarTamanho?: boolean;
}) {
  const { data: produtos = [] } = useQuery(produtosQueryOptions);
  const { data: cores = [] } = useQuery(coresQueryOptions);
  const { data: estampas = [] } = useQuery(estampasSimplesQueryOptions);
  const { data: pessoas = [] } = useQuery(pessoasQueryOptions);
  const produto = produtos.find((x) => x.id === peca?.produto_id);
  const tamanhos = tamanhosDoProduto(produto);
  const vazia = !peca;
  const tamRef = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (focarTamanho) tamRef.current?.focus(); }, [focarTamanho]);

  const opProdutos = useMemo(() => produtos.filter((x) => x.ativo).map((x) => ({ id: x.id, nome: nomePai(x) })), [produtos]);
  const opCores = useMemo(() => cores.filter((x) => x.ativo).map((x) => ({ id: x.id, nome: x.nome, hex: x.hex })), [cores]);
  const opEstampas = useMemo(() => estampas.map((x) => ({ id: x.id, nome: x.nome })), [estampas]);

  return (
    <div className={cn(GRID, "border-t-[0.5px] border-border py-[3px]", vazia && "bg-primary-soft/30")}>
      <Seletor disabled={!editavel} valor={peca?.produto_nome ?? null} opcoes={opProdutos} placeholder={vazia ? "Modelo…" : "—"}
        onEscolher={(o) => onSalvar({ produto_id: o.id, produto_nome: o.nome })} />
      <Seletor disabled={!editavel} valor={peca?.estampa_nome ?? null} vazioTexto="Lisa" opcoes={opEstampas} placeholder={vazia ? "Estampa…" : "Lisa"}
        permitirLimpar="Lisa" onEscolher={(o) => onSalvar({ estampa_id: o.id || null, estampa_nome: o.id ? o.nome : null })} />
      <Seletor disabled={!editavel} valor={peca?.cor_nome ?? null} opcoes={opCores} placeholder={vazia ? "Cor…" : "—"}
        onEscolher={(o) => onSalvar({ cor_id: o.id, cor_nome: o.nome })} />
      <select
        ref={tamRef}
        disabled={!editavel}
        value={peca?.tamanho ?? ""}
        onChange={(e) => onSalvar({ tamanho: e.target.value || null })}
        className="h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-[14px] hover:border-border focus:border-ring focus:outline-none disabled:opacity-100"
      >
        <option value="">{vazia ? "Tam." : "—"}</option>
        {[...new Set([...(peca?.tamanho && !tamanhos.includes(peca.tamanho) ? [peca.tamanho] : []), ...tamanhos])].map((t) => <option key={t}>{t}</option>)}
      </select>
      <CampoTexto disabled={!editavel} valor={peca?.pessoa ?? ""} placeholder={vazia ? "Pessoa…" : ""} sugestoes={pessoas}
        onGravar={(v) => { if (v !== (peca?.pessoa ?? "")) onSalvar({ pessoa: v || null }); }} />
      {MARCAS.map((m) => {
        const { Icone, texto } = ICONES[m];
        if (m === "devolvida" && !peca?.retorna) {
          return <span key={m} title="Esta peça não precisa voltar" className="flex justify-center text-muted-foreground/50">–</span>;
        }
        const ligado = !!peca?.[m];
        return (
          <button
            key={m}
            type="button"
            title={texto}
            aria-label={texto}
            aria-pressed={ligado}
            disabled={!editavel || vazia}
            onClick={() => onSalvar({ [m]: !ligado } as Partial<Peca>)}
            className={cn(
              "mx-auto flex size-7 items-center justify-center rounded-md transition-colors",
              ligado ? "bg-secondary text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground",
              vazia && "invisible",
            )}
          >
            <Icone className="size-4" />
          </button>
        );
      })}
      <CampoTexto disabled={!editavel || vazia} valor={peca?.observacao ?? ""} placeholder=""
        onGravar={(v) => { if (v !== (peca?.observacao ?? "")) onSalvar({ observacao: v || null }); }} />
      {peca && editavel ? (
        <button type="button" title="Copiar linha" aria-label="Copiar linha" onClick={onCopiar} className="mx-auto flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Copy className="size-3.5" />
        </button>
      ) : <span />}
    </div>
  );
}

function Seletor({ valor, opcoes, onEscolher, placeholder, disabled, vazioTexto, permitirLimpar }: {
  valor: string | null;
  opcoes: { id: string; nome: string; hex?: string }[];
  onEscolher: (o: { id: string; nome: string }) => void;
  placeholder: string;
  disabled?: boolean;
  vazioTexto?: string;
  permitirLimpar?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const texto = valor ?? null;
  return (
    <Popover open={aberto} onOpenChange={(o) => !disabled && setAberto(o)}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} title={texto ?? undefined}
          className="h-7 w-full truncate rounded-md border border-transparent px-1 text-left hover:border-border focus:border-ring focus:outline-none disabled:cursor-default disabled:hover:border-transparent">
          {texto ? texto : <span className="text-muted-foreground">{vazioTexto && placeholder === vazioTexto ? vazioTexto : placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar…" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {permitirLimpar ? (
              <CommandItem value={`__${permitirLimpar}`} onSelect={() => { onEscolher({ id: "", nome: "" }); setAberto(false); }}>
                <span className="text-muted-foreground">{permitirLimpar}</span>
              </CommandItem>
            ) : null}
            {opcoes.map((o) => (
              <CommandItem key={o.id} value={`${o.nome} ${o.id}`} onSelect={() => { onEscolher(o); setAberto(false); }}>
                {o.hex ? <span className="size-3 rounded-full border border-border" style={{ background: o.hex }} /> : null}
                {o.nome}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

let contadorLista = 0;

function CampoTexto({ valor, onGravar, placeholder, disabled, sugestoes }: {
  valor: string; onGravar: (v: string) => void; placeholder: string; disabled?: boolean; sugestoes?: string[];
}) {
  const [v, setV] = useState(valor);
  const [lista] = useState(() => `seeding-lista-${++contadorLista}`);
  useEffect(() => setV(valor), [valor]);
  return (
    <>
      <input
        value={v}
        disabled={disabled}
        title={v || undefined}
        placeholder={placeholder}
        list={sugestoes ? lista : undefined}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onGravar(v.trim())}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="h-7 w-full truncate rounded-md border border-transparent bg-transparent px-1 text-[14px] placeholder:text-muted-foreground hover:border-border focus:border-ring focus:outline-none disabled:hover:border-transparent"
      />
      {sugestoes ? (
        <datalist id={lista}>
          {sugestoes.slice(0, 50).map((s) => <option key={s} value={s} />)}
        </datalist>
      ) : null}
    </>
  );
}
