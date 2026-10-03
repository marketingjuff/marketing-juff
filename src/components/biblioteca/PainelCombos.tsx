import { useEffect, useMemo, useState } from "react";

const FILTRO_PADRAO: Genero[] = ["masculino", "feminino", "infantil"];
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bolinha, CardCombo, CardCromia, type TamanhoCard, EscolherCorEstampa, hexDoCodigo, useCoresEstampa } from "@/components/biblioteca/EstampaVisual";
import { coresQueryOptions } from "@/lib/biblioteca";
import {
  GENEROS,
  ROTULO_GENERO,
  apagarCombo,
  combosQueryOptions,
  criarCombo,
  salvarCombo,
  textoCmykItem,
  type Combo,
  type Genero,
  type ItemCor,
} from "@/lib/biblioteca-estampas";

const K = combosQueryOptions.queryKey;

export function PainelCombos({ editavel = true }: { editavel?: boolean }) {
  const qc = useQueryClient();
  const { data: combos = [] } = useQuery(combosQueryOptions);
  const { data: cores = [] } = useQuery(coresQueryOptions);
  const { porCodigo } = useCoresEstampa();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Combo | "novo" | null>(null);
  const q = busca.trim().toUpperCase();
  const filtrados = useMemo(() => combos.filter((c) => !q || c.codigo.toUpperCase().includes(q)), [combos, q]);
  const corPorId = useMemo(() => new Map(cores.map((c) => [c.id, c])), [cores]);
  const [filtro, setFiltro] = useState<Genero[]>(FILTRO_PADRAO);
  const [tamanho, setTamanho] = useState<TamanhoCard>("m");
  const [verUso, setVerUso] = useState<string | null>(null);
  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem("juff:combos:filtro") ?? "null");
      if (Array.isArray(f)) setFiltro(f.filter((x) => GENEROS.includes(x)));
      const t = localStorage.getItem("juff:combos:tamanho");
      if (t === "p" || t === "m" || t === "g") setTamanho(t);
    } catch { /* ignora */ }
  }, []);
  function alternar(g: Genero) {
    const n = filtro.includes(g) ? filtro.filter((x) => x !== g) : [...filtro, g];
    setFiltro(n);
    localStorage.setItem("juff:combos:filtro", JSON.stringify(n));
  }
  function mudarTamanho(t: TamanhoCard) {
    setTamanho(t);
    localStorage.setItem("juff:combos:tamanho", t);
  }
  const secoes = useMemo(() => {
    const num = (c: string) => parseInt(c.replace(/\D/g, ""), 10) || 0;
    const so = filtro.length === 1 && filtro[0] === "unissex";
    const defs: { chave: string; rotulo: string; itens: { combo: Combo; uni: boolean }[] }[] = [];
    const base = (["masculino", "feminino", "infantil"] as const).filter((g) => filtro.includes(g));
    for (const g of base) {
      defs.push({
        chave: g,
        rotulo: ROTULO_GENERO[g],
        itens: filtrados
          .filter((c) => c.genero === g || (!so && g !== "infantil" && c.genero === "unissex"))
          .map((c) => ({ combo: c, uni: c.genero === "unissex" })),
      });
    }
    if (filtro.includes("unissex")) defs.push({ chave: "unissex", rotulo: ROTULO_GENERO.unissex, itens: filtrados.filter((c) => c.genero === "unissex").map((c) => ({ combo: c, uni: false })) });
    return defs
      .filter((d) => d.itens.length)
      .map((d) => {
        const porCor = new Map<string, { combo: Combo; uni: boolean }[]>();
        for (const it of d.itens) {
          const k = it.combo.cor_id ?? "";
          porCor.set(k, [...(porCor.get(k) ?? []), it]);
        }
        const faixas = [...porCor.entries()].map(([cid, lista]) => ({
          cid,
          lista: lista.sort((x, y) => y.combo.uso - x.combo.uso || num(x.combo.codigo) - num(y.combo.codigo)),
          soma: lista.reduce((s, x) => s + x.combo.uso, 0),
          nome: corPorId.get(cid)?.nome ?? "",
        }));
        faixas.sort((x, y) => y.soma - x.soma || y.lista.length - x.lista.length || x.nome.localeCompare(y.nome));
        return { chave: d.chave, rotulo: d.rotulo, faixas, total: d.itens.length };
      });
  }, [filtrados, filtro, corPorId]);

  function apagar(c: Combo) {
    const msg = c.uso ? `O combo ${c.codigo} está em ${c.uso} estampa(s). As receitas continuam com as mesmas cores, só perdem o código. Apagar?` : `Apagar o combo ${c.codigo}?`;
    if (!confirm(msg)) return;
    const antes = qc.getQueryData<Combo[]>(K);
    qc.setQueryData<Combo[]>(K, (l) => l?.filter((x) => x.id !== c.id));
    apagarCombo(c.id).catch((e: Error) => {
      qc.setQueryData(K, antes);
      toast.error(e.message);
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="truncate text-sm font-semibold">Combos de estampa</h3>
          <span className="shrink-0 text-xs text-muted-foreground">{combos.length} no catálogo</span>
        </div>
        {editavel ? <Button size="sm" className="shrink-0 gap-1 sm:order-3" onClick={() => setEditando("novo")}><Plus className="size-4" /> Novo combo</Button> : null}
        <div className="col-span-2 flex flex-wrap items-center gap-1 sm:order-2 sm:ml-auto">
          {(["masculino", "feminino", "infantil", "unissex"] as const).map((g) => (
            <Button key={g} size="sm" variant={filtro.includes(g) ? "default" : "outline"} className="h-8 px-2.5 text-xs" onClick={() => alternar(g)}>{ROTULO_GENERO[g]}</Button>
          ))}
          <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={tamanho} onChange={(e) => mudarTamanho(e.target.value as TamanhoCard)} title="Tamanho dos cards">
            <option value="p">Pequeno</option><option value="m">Médio</option><option value="g">Grande</option>
          </select>
        </div>
        <Input placeholder="Buscar código" value={busca} onChange={(e) => setBusca(e.target.value)} className="col-span-2 h-8 w-full sm:order-2 sm:w-40" />
      </div>
      {editando ? (
        <FormCombo
          inicial={editando === "novo" ? null : editando}
          cores={cores}
          onCancelar={() => setEditando(null)}
          onPronto={() => { setEditando(null); void qc.invalidateQueries({ queryKey: K }); }}
        />
      ) : null}
      {secoes.map(({ chave, rotulo, faixas, total }) => (
        <section key={chave} className="space-y-1.5">
          <h4 className="text-2xl font-semibold uppercase text-muted-foreground">{rotulo} · {total}</h4>
          <div className="flex flex-wrap gap-1.5">
          <CardCromia tamanho={tamanho} />
          {faixas.flatMap(({ cid, lista }) => {
            const cor = corPorId.get(cid);
            return lista.map(({ combo: c, uni }) => (
                <Popover key={c.id} open={verUso === `${chave}:${c.id}`} onOpenChange={(o) => setVerUso(o ? `${chave}:${c.id}` : null)}>
                  <PopoverAnchor asChild>
                    <div className="group flex flex-col items-center">
                      <CardCombo
                        codigo={c.codigo}
                        fundo={cor?.hex ?? "#888888"}
                        itens={c.itens}
                        porCodigo={porCodigo}
                        tamanho={tamanho}
                        uso={c.uso}
                        onVerUso={() => setVerUso(`${chave}:${c.id}`)}
                        marcaUni={uni}
                        title={[cor?.nome ?? "Sem cor de camiseta", ...c.itens.map((it) => `${it.codigo} ${textoCmykItem(it)}`)].join(" · ")}
                        onClick={editavel ? () => setEditando(c) : undefined}
                      />
                      {editavel ? <Button variant="ghost" size="icon" className="mt-0.5 size-5 opacity-0 transition-opacity group-hover:opacity-100" title="Apagar combo" onClick={(e) => { e.stopPropagation(); apagar(c); }}><Trash2 className="size-3" /></Button> : null}
                    </div>
                  </PopoverAnchor>
                  <PopoverContent className="w-56 text-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <ul className="space-y-0.5">{c.estampas.map((e) => <li key={e}>{e}</li>)}</ul>
                  </PopoverContent>
                </Popover>
            ));
          })}
          </div>
        </section>
      ))}
    </div>
  );
}

function FormCombo({ inicial, cores, onCancelar, onPronto }: {
  inicial: Combo | null;
  cores: { id: string; nome: string; hex: string }[];
  onCancelar: () => void;
  onPronto: () => void;
}) {
  const { porCodigo } = useCoresEstampa();
  const [genero, setGenero] = useState<Genero>(inicial?.genero ?? "masculino");
  const [corId, setCorId] = useState<string>(inicial?.cor_id ?? cores[0]?.id ?? "");
  const [itens, setItens] = useState<ItemCor[]>(inicial?.itens ?? []);
  const [gravando, setGravando] = useState(false);

  async function gravar() {
    if (!itens.length) { toast.error("Escolha ao menos uma cor."); return; }
    setGravando(true);
    try {
      if (inicial) await salvarCombo(inicial.id, { genero, cor_id: corId || null }, itens);
      else {
        const r = await criarCombo(genero, corId || null, itens);
        toast.success(r.criado ? `Combo ${r.codigo} criado` : `Já existia como ${r.codigo}`);
      }
      onPronto();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/40 bg-card p-3">
      <div className="flex flex-wrap gap-2">
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={genero} onChange={(e) => setGenero(e.target.value as Genero)}>
          {GENEROS.map((g) => <option key={g} value={g}>{ROTULO_GENERO[g]}</option>)}
        </select>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize" value={corId} onChange={(e) => setCorId(e.target.value)}>
          {cores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        {itens.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <Bolinha hex={hexDoCodigo(porCodigo, it.codigo)} /> <span className="w-12 font-semibold">{it.codigo}</span>
            <span className="tabular-nums text-muted-foreground">{textoCmykItem(it)}</span>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setItens(itens.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
        <Popover>
          <PopoverTrigger asChild><Button variant="ghost" size="sm" className="gap-1"><Plus className="size-4" /> Cor</Button></PopoverTrigger>
          <PopoverContent className="w-80"><EscolherCorEstampa onEscolher={(c) => setItens([...itens, { codigo: c.codigo, c: c.c, m: c.m, y: c.y, k: c.k }])} /></PopoverContent>
        </Popover>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={gravando} onClick={() => void gravar()}>{inicial ? "Salvar" : "Criar combo"}</Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}
