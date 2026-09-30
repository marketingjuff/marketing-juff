import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { coresQueryOptions, criarCor, salvarCor, type CorBiblioteca } from "@/lib/biblioteca";

const HEX = /^#[0-9a-f]{6}$/;
const CHAVE = coresQueryOptions.queryKey;

export function PainelCoresProduto() {
  const qc = useQueryClient();
  const { data: cores = [] } = useQuery(coresQueryOptions);
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState(false);

  function patch(id: string, p: Partial<CorBiblioteca>) {
    const antes = qc.getQueryData<CorBiblioteca[]>(CHAVE);
    qc.setQueryData<CorBiblioteca[]>(CHAVE, (l) => l?.map((c) => (c.id === id ? { ...c, ...p } : c)));
    salvarCor(id, p).catch((e: Error) => {
      qc.setQueryData(CHAVE, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cores.length} cores cadastradas</p>
        <Button size="sm" className="gap-1" onClick={() => setNova(true)}><Plus className="size-4" /> Nova cor</Button>
      </div>
      <ul className="space-y-1">
        {cores.map((c) =>
          aberta === c.id ? (
            <li key={c.id}>
              <FormCor inicial={c} onCancelar={() => setAberta(null)} onSalvar={(v) => { patch(c.id, v); setAberta(null); }} />
            </li>
          ) : (
            <li key={c.id}>
              <button type="button" onClick={() => setAberta(c.id)}
                className={cn("flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-secondary", !c.ativo && "opacity-50")}>
                <span className="size-5 shrink-0 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                <span className="text-sm font-medium">{c.nome}</span>
                <span className="text-xs text-muted-foreground">{c.nome_olist}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{c.hex}</span>
              </button>
            </li>
          ),
        )}
        {nova ? (
          <li>
            <FormCor
              inicial={{ nome: "", nome_olist: "", hex: "#000000", ativo: true }}
              onCancelar={() => setNova(false)}
              onSalvar={(v) => {
                setNova(false);
                criarCor(v.nome, v.nome_olist, v.hex, (cores.at(-1)?.posicao ?? 0) + 1)
                  .then(() => qc.invalidateQueries({ queryKey: CHAVE }))
                  .catch((e: Error) => toast.error(e.message));
              }}
            />
          </li>
        ) : null}
      </ul>
    </div>
  );
}

type Valores = { nome: string; nome_olist: string; hex: string; ativo: boolean };

function FormCor({ inicial, onSalvar, onCancelar }: { inicial: Valores; onSalvar: (v: Valores) => void; onCancelar: () => void }) {
  const [v, setV] = useState<Valores>({ nome: inicial.nome, nome_olist: inicial.nome_olist, hex: inicial.hex, ativo: inicial.ativo });
  const valido = v.nome.trim() && v.nome_olist.trim() && HEX.test(v.hex);
  return (
    <div className="grid gap-3 rounded-lg border border-primary/40 p-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs text-muted-foreground">
        Nome
        <Input autoFocus value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} className="h-8" />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Nome na Olist
        <Input value={v.nome_olist} onChange={(e) => setV({ ...v, nome_olist: e.target.value })} className="h-8" />
        <span className="block text-[11px]">É este nome que entra na planilha. Precisa estar idêntico ao da Olist, inclusive acento e minúscula.</span>
      </label>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        Cor <ColorPicker value={v.hex} onChange={(hex) => setV({ ...v, hex: hex.toLowerCase() })} label="Cor" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.ativo} onCheckedChange={(x) => setV({ ...v, ativo: x === true })} /> Ativo
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" disabled={!valido} onClick={() => onSalvar({ ...v, nome: v.nome.trim(), nome_olist: v.nome_olist.trim() })}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}
