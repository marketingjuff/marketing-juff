import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bloco, CampoAutoSave, copiar } from "@/components/biblioteca/comum";
import { textoSobreCor } from "@/config/produtos";
import { cn } from "@/lib/utils";
import {
  apagarCorPaleta,
  criarCorPaleta,
  paletaQueryOptions,
  salvarCorPaleta,
  type CorPaleta,
} from "@/lib/biblioteca-marca";
import { type CorBiblioteca } from "@/lib/biblioteca";

const K_PAL = paletaQueryOptions.queryKey;
export const HEX = /^#[0-9a-f]{6}$/;

// ---------------- Grade de largura fixa ----------------

/** Largura fixa (130–150px) de propósito: evita pastilhas esticadas em tela larga. */
function Grade({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid justify-start gap-1.5 grid-cols-[repeat(auto-fill,minmax(130px,150px))]">
      {children}
    </div>
  );
}

// ---------------- Pastilha achatada ----------------

function Pastilha({
  nome,
  hex,
  teste = false,
  children,
}: {
  nome: string;
  hex: string;
  teste?: boolean;
  children?: React.ReactNode;
}) {
  const seguro = HEX.test(hex) ? hex : "#888888";
  const fg = textoSobreCor(seguro);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => void copiar(hex, `${nome}: ${hex.toUpperCase()} copiado`)}
        title={`${nome}  ${hex.toUpperCase()}`}
        className={cn(
          "flex w-full flex-col justify-center rounded-lg px-3 py-2 text-left transition-transform hover:-translate-y-px active:translate-y-0",
          teste && "outline-dashed outline-2 -outline-offset-2 outline-current",
        )}
        style={{ backgroundColor: seguro, color: fg }}
      >
        <span className="truncate text-xs font-semibold leading-tight">{nome}</span>
        <span className="truncate text-[10px] leading-tight opacity-70">{hex.toUpperCase()}</span>
      </button>
      {children}
    </div>
  );
}

// ---------------- Cores de camiseta, somente leitura ----------------

export function SecaoCamiseta({ cores }: { cores: CorBiblioteca[] }) {
  const ativas = cores.filter((c) => c.ativo);

  return (
    <Bloco titulo="Cores de camiseta">
      <p className="mb-3 text-xs text-muted-foreground">
        Cartela oficial de tecido, {ativas.length} cores. Clique para copiar. Para editar, vá em Configurações, seção Biblioteca.
      </p>
      <Grade>
        {ativas.map((c) => (
          <Pastilha key={c.id} nome={c.nome} hex={c.hex} />
        ))}
      </Grade>
    </Bloco>
  );
}

// ---------------- Paleta ----------------

export function SecaoPaleta({ paleta, admin }: { paleta: CorPaleta[]; admin: boolean }) {
  const qc = useQueryClient();
  const ativas = paleta.filter((c) => c.ativo);
  const oficiais = ativas.filter((c) => !c.rascunho);
  const testes = ativas.filter((c) => c.rascunho);

  function patch(id: string, p: Partial<CorPaleta>) {
    const antes = qc.getQueryData<CorPaleta[]>(K_PAL);
    qc.setQueryData<CorPaleta[]>(K_PAL, (l) => l?.map((c) => (c.id === id ? { ...c, ...p } : c)));
    salvarCorPaleta(id, p).catch((e: Error) => {
      qc.setQueryData(K_PAL, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  async function acrescentar() {
    const max = paleta.reduce((m, c) => Math.max(m, c.posicao), 0);
    try {
      await criarCorPaleta(`Nova cor ${max + 1}`, "#888888", max + 1);
      void qc.invalidateQueries({ queryKey: K_PAL });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function apagar(id: string) {
    if (!confirm("Apagar esta cor da paleta?")) return;
    const antes = qc.getQueryData<CorPaleta[]>(K_PAL);
    qc.setQueryData<CorPaleta[]>(K_PAL, (l) => l?.filter((c) => c.id !== id));
    apagarCorPaleta(id).catch((e: Error) => {
      qc.setQueryData(K_PAL, antes);
      toast.error(e.message);
    });
  }

  const grade = (lista: CorPaleta[], teste: boolean) => (
    <Grade>
      {lista.map((c) => (
        <Quadrado key={c.id} cor={c} teste={teste} admin={admin} onPatch={(p) => patch(c.id, p)} onApagar={() => void apagar(c.id)} />
      ))}
    </Grade>
  );

  return (
    <Bloco titulo="Paleta do manual de marca" acoes={admin ? (
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => void acrescentar()}><Plus className="size-4" /> Acrescentar cor</Button>
    ) : undefined}>
      <p className="mb-3 text-xs text-muted-foreground">Cores digitais do manual. Não são cores de tecido. A cartela de camiseta fica em Produtos.</p>
      {grade(oficiais, false)}
      {testes.length ? (
        <>
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cores em teste</h3>
          {grade(testes, true)}
        </>
      ) : null}
    </Bloco>
  );
}

function Quadrado({ cor, teste, admin, onPatch, onApagar }: { cor: CorPaleta; teste: boolean; admin: boolean; onPatch: (p: Partial<CorPaleta>) => void; onApagar: () => void }) {
  return (
    <Pastilha nome={cor.nome} hex={cor.hex} teste={teste}>
      {admin ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Editar ${cor.nome}`}
              className="absolute right-1 top-1 rounded-md bg-background/85 p-0.5 text-foreground opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Pencil className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3">
            <CampoAutoSave valor={cor.nome} onSalvar={(v) => v.trim() && onPatch({ nome: v.trim() })} />
            <ColorPicker value={cor.hex} onChange={(hex) => HEX.test(hex) && onPatch({ hex })} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={cor.rascunho} onCheckedChange={(v) => onPatch({ rascunho: v === true })} /> Em teste
            </label>
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={onApagar}><Trash2 className="size-4" /> Apagar cor</Button>
          </PopoverContent>
        </Popover>
      ) : null}
    </Pastilha>
  );
}
