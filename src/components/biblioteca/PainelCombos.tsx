import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Amostra, Bolinha, EscolherCorEstampa, hexDoCodigo, useCoresEstampa } from "@/components/biblioteca/EstampaVisual";
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
  const filtrados = combos.filter((c) => !q || c.codigo.toUpperCase().includes(q));
  const corPorId = new Map(cores.map((c) => [c.id, c]));

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
        <Input placeholder="Buscar código" value={busca} onChange={(e) => setBusca(e.target.value)} className="col-span-2 h-8 w-full sm:ml-auto sm:w-40" />
      </div>
      {editando ? (
        <FormCombo
          inicial={editando === "novo" ? null : editando}
          cores={cores}
          onCancelar={() => setEditando(null)}
          onPronto={() => { setEditando(null); void qc.invalidateQueries({ queryKey: K }); }}
        />
      ) : null}
      {GENEROS.map((g) => {
        const doGenero = filtrados.filter((c) => c.genero === g);
        if (!doGenero.length) return null;
        const porCor = new Map<string, Combo[]>();
        for (const c of doGenero) {
          const k = c.cor_id ?? "";
          porCor.set(k, [...(porCor.get(k) ?? []), c]);
        }
        return (
          <section key={g} className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{ROTULO_GENERO[g]} · {doGenero.length}</h4>
            {[...porCor.entries()].map(([cid, lista]) => {
              const cor = corPorId.get(cid);
              return (
                <div key={cid} className="rounded-lg border border-border p-1.5">
                  <div className="mb-1 flex items-center gap-1.5 px-0.5 text-xs font-medium capitalize"><Bolinha hex={cor?.hex ?? null} tamanho={11} /> {cor?.nome ?? "Sem cor de camiseta"}</div>
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                    {lista.map((c) => (
                      <div key={c.id} className="rounded-md border border-border bg-background px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{c.codigo}</span>
                          <Amostra fundo={cor?.hex ?? "#888888"} itens={c.itens} porCodigo={porCodigo} />
                          <div className="ml-auto flex">
                            {editavel ? <Button variant="ghost" size="icon" className="size-6" title="Editar combo" onClick={() => setEditando(c)}><Pencil className="size-3" /></Button> : null}
                            {editavel ? <Button variant="ghost" size="icon" className="size-6" title="Apagar combo" onClick={() => apagar(c)}><Trash2 className="size-3" /></Button> : null}
                          </div>
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          {c.itens.map((it, i) => (
                            <span key={i} className="flex items-center gap-1 text-[11px] leading-4">
                              <Bolinha hex={hexDoCodigo(porCodigo, it.codigo)} tamanho={10} />
                              <strong>{it.codigo}</strong>
                              <span className="tabular-nums text-muted-foreground">{textoCmykItem(it)}</span>
                            </span>
                          ))}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="ml-auto shrink-0 text-[10px] leading-4 text-primary hover:underline" disabled={!c.uso}>{c.uso} estampa{c.uso === 1 ? "" : "s"}</button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 text-sm">
                              <ul className="space-y-0.5">{c.estampas.map((e) => <li key={e}>{e}</li>)}</ul>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
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
