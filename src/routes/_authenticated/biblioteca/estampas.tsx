import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BotaoZip } from "@/components/biblioteca/BotaoZip";
import { Bloco, CampoAutoSave, copiar } from "@/components/biblioteca/comum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { textoSobreCor } from "@/config/produtos";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  FAMILIAS,
  POR_LINHA,
  ROTULO_FAMILIA,
  apagarCorEstampa,
  criarCorEstampa,
  emLinhas,
  estampaQueryOptions,
  salvarCorEstampa,
  textoCmyk,
  type CorEstampa,
  type Familia,
} from "@/lib/biblioteca-estampa";

const K = estampaQueryOptions.queryKey;
const HEX = /^#[0-9a-f]{6}$/;
type Patch = Parameters<typeof salvarCorEstampa>[1];

export const Route = createFileRoute("/_authenticated/biblioteca/estampas")({
  head: () => ({
    meta: [
      { title: "Cores de estampa — Biblioteca — Marketing Juff" },
      { name: "description", content: "Cores de estampa: as 252 cores da Juff com CMYK e hexadecimal." },
      { property: "og:title", content: "Cores de estampa — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Cores de estampa: as 252 cores da Juff com CMYK e hexadecimal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EstampasPage,
});

function EstampasPage() {
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.estampa");
  const podeEditar = canEdit(profile, "biblioteca.estampa");
  const admin = profile?.role === "admin" && podeEditar;
  const { data: cores = [] } = useQuery({ ...estampaQueryOptions, enabled: pode });

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Você não tem acesso à Biblioteca de estampa.</p>
      </AppShell>
    );
  }

  function patch(id: string, p: Patch) {
    const antes = qc.getQueryData<CorEstampa[]>(K);
    qc.setQueryData<CorEstampa[]>(K, (l) => l?.map((c) => (c.id === id ? { ...c, ...p } : c)));
    salvarCorEstampa(id, p).catch((e: Error) => {
      qc.setQueryData(K, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  function apagar(id: string) {
    if (!confirm("Apagar esta cor de estampa?")) return;
    const antes = qc.getQueryData<CorEstampa[]>(K);
    qc.setQueryData<CorEstampa[]>(K, (l) => l?.filter((c) => c.id !== id));
    apagarCorEstampa(id).catch((e: Error) => {
      qc.setQueryData(K, antes);
      toast.error(e.message);
    });
  }

  async function acrescentar(familia: Familia) {
    const maxGeral = cores.reduce((m, c) => Math.max(m, c.posicao), 0);
    const novos = cores.filter((c) => /^Nova\d+$/.test(c.codigo)).map((c) => Number(c.codigo.slice(4)));
    const n = (novos.length ? Math.max(...novos) : 0) + 1;
    try {
      await criarCorEstampa(familia, `Nova${n}`, maxGeral + 1);
      void qc.invalidateQueries({ queryKey: K });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppShell largura="ampla">
        {!podeEditar ? (
          <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Você está em modo de consulta. Pode ver, copiar e baixar, mas não alterar.
          </p>
        ) : null}
      <div className="mb-4 flex justify-end"><BotaoZip origem="estampas" /></div>
      <p className="mb-4 text-xs text-muted-foreground">
        O CMYK é o dado real, é ele que vai para a arte. O hexadecimal serve apenas para a cor aparecer parecida na tela. Clique copia o CMYK, Alt mais clique copia o hexadecimal.
      </p>
      <div className="space-y-6">
        {FAMILIAS.map((familia) => {
          const lista = cores.filter((c) => c.familia === familia && c.ativo);
          const porLinha = POR_LINHA[familia];
          const pequena = familia === "cromatica";
          return (
            <Bloco
              key={familia}
              titulo={`${ROTULO_FAMILIA[familia]} · ${lista.length}`}
              acoes={admin ? (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => void acrescentar(familia)}>
                  <Plus className="size-4" /> Acrescentar cor
                </Button>
              ) : undefined}
            >
              {emLinhas(lista, porLinha).map((linha, i) => (
                <div key={i} className="mb-[3px] grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${porLinha}, minmax(0, 1fr))` }}>
                  {linha.map((cor) => (
                    <Pastilha key={cor.id} cor={cor} pequena={pequena} admin={admin} onPatch={(p) => patch(cor.id, p)} onApagar={() => apagar(cor.id)} />
                  ))}
                </div>
              ))}
            </Bloco>
          );
        })}
      </div>
    </AppShell>
  );
}

function Pastilha({ cor, pequena, admin, onPatch, onApagar }: { cor: CorEstampa; pequena: boolean; admin: boolean; onPatch: (p: Patch) => void; onApagar: () => void }) {
  const seguro = HEX.test(cor.hex) ? cor.hex : "#888888";
  return (
    <div className="group relative min-w-0">
      <button
        type="button"
        onClick={(e) => {
          const v = e.altKey ? cor.hex.toUpperCase() : textoCmyk(cor);
          void copiar(v, `${cor.codigo}: ${v} copiado`);
        }}
        title={`${cor.codigo}  CMYK ${textoCmyk(cor)}  ${cor.hex.toUpperCase()}${cor.nome ? `  ${cor.nome}` : ""}`}
        className={cn(
          "flex w-full min-w-0 flex-col justify-center overflow-hidden rounded px-1 text-left [container-type:inline-size] hover:outline hover:outline-2 hover:-outline-offset-2 active:opacity-80",
          pequena ? "aspect-[1.55/1]" : "aspect-[2.4/1]",
        )}
        style={{ backgroundColor: seguro, color: textoSobreCor(seguro) }}
      >
        <span className={cn("font-bold leading-tight", pequena ? "text-[clamp(7px,30cqw,13px)]" : "text-[clamp(9px,13cqw,14px)]")}>{cor.codigo}</span>
        <span className={cn("whitespace-nowrap font-medium leading-tight tabular-nums", pequena ? "text-[clamp(5px,15cqw,9px)]" : "text-[clamp(7px,8cqw,10px)]")}>{textoCmyk(cor)}</span>
      </button>
      {admin ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Editar ${cor.codigo}`}
              className={cn(
                "absolute right-0.5 top-0.5 rounded bg-background/85 p-0.5 text-foreground opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100",
                pequena && "hidden sm:block",
              )}
            >
              <Pencil className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3">
            <label className="block space-y-1 text-xs text-muted-foreground">Código
              <CampoAutoSave valor={cor.codigo} onSalvar={(v) => v.trim() && v.trim() !== cor.codigo && onPatch({ codigo: v.trim() })} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">Nome
              <CampoAutoSave valor={cor.nome} placeholder="Sem nome" onSalvar={(v) => v.trim() !== cor.nome && onPatch({ nome: v.trim() })} />
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["c", "m", "y", "k"] as const).map((canal) => (
                <CampoCanal key={canal} rotulo={canal.toUpperCase()} valor={cor[canal]} onSalvar={(n) => onPatch({ [canal]: n })} />
              ))}
            </div>
            <ColorPicker value={cor.hex} onChange={(hex) => HEX.test(hex) && hex !== cor.hex && onPatch({ hex })} />
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={onApagar}><Trash2 className="size-4" /> Apagar cor</Button>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

/** Campo de 0 a 100 que grava ao sair ou após 700ms parado. */
function CampoCanal({ rotulo, valor, onSalvar }: { rotulo: string; valor: number; onSalvar: (n: number) => void }) {
  const [texto, setTexto] = useState(String(valor));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setTexto(String(valor)), [valor]);

  function gravar(v: string) {
    if (timer.current) clearTimeout(timer.current);
    const n = Math.round(Number(v));
    if (v.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      setTexto(String(valor));
      return;
    }
    if (n !== valor) onSalvar(n);
  }

  return (
    <label className="space-y-1 text-center text-xs font-semibold text-muted-foreground">
      {rotulo}
      <Input
        inputMode="numeric"
        className="h-8 px-1 text-center tabular-nums"
        value={texto}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
          setTexto(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => gravar(v), 700);
        }}
        onBlur={(e) => gravar(e.target.value)}
      />
    </label>
  );
}
