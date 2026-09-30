import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IconeCampo } from "@/components/estrategia/IconeCampo";
import {
  FRENTES, ICONES_CAMPO, atualizarCampo, camposQueryOptions, criarCampo,
  reordenarCampos, type Frente,
} from "@/lib/estrategia";

export function PainelCamposEstrategia() {
  const qc = useQueryClient();
  const [frente, setFrente] = useState<Frente>("store");
  const [novo, setNovo] = useState("");
  const { data: campos = [] } = useQuery(camposQueryOptions(frente));
  const chave = ["estrategia", "campos", frente] as const;

  function invalidar() {
    void qc.invalidateQueries({ queryKey: chave });
  }

  async function mover(id: string, passo: number) {
    const ids = campos.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    qc.setQueryData(chave, ids.map((x) => campos.find((c) => c.id === x)!).filter(Boolean));
    try {
      await reordenarCampos(frente, ids);
      invalidar();
    } catch {
      invalidar();
      toast.error("Não deu para reordenar");
    }
  }

  const ativos = campos.filter((c) => c.ativo).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-border">
          {FRENTES.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFrente(f.valor)}
              className={
                "px-3 py-1.5 text-xs font-medium transition-colors " +
                (frente === f.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {ativos > 10 ? (
        <p className="rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          Esta frente tem {ativos} campos ativos. A grade dos doze meses fica pesada de ler com muito campo.
          Desmarque os que não precisam aparecer no panorama.
        </p>
      ) : null}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {campos.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 p-2">
            <div className="flex flex-col">
              <button type="button" aria-label="Subir" className="text-muted-foreground hover:text-foreground" onClick={() => mover(c.id, -1)} disabled={i === 0}>
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" aria-label="Descer" className="text-muted-foreground hover:text-foreground" onClick={() => mover(c.id, 1)} disabled={i === campos.length - 1}>
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            <Select
              value={c.icone}
              onValueChange={async (v) => {
                try { await atualizarCampo(c.id, { icone: v }); invalidar(); }
                catch { toast.error("Não deu para trocar o ícone"); }
              }}
            >
              <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICONES_CAMPO.map((n) => (
                  <SelectItem key={n} value={n}>
                    <span className="flex items-center gap-2">
                      <IconeCampo nome={n} className="size-4" /> {n}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              defaultValue={c.label}
              className="h-8 min-w-[10rem] flex-1 text-sm"
              onBlur={async (e) => {
                const v = e.target.value.trim();
                if (!v || v === c.label) return;
                try { await atualizarCampo(c.id, { label: v }); invalidar(); }
                catch { toast.error("Não deu para renomear"); }
              }}
            />

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Switch
                checked={c.no_panorama}
                onCheckedChange={async (v) => {
                  try { await atualizarCampo(c.id, { no_panorama: v }); invalidar(); }
                  catch { toast.error("Não deu para salvar"); }
                }}
              />
              No panorama
            </label>

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Switch
                checked={c.ativo}
                onCheckedChange={async (v) => {
                  try { await atualizarCampo(c.id, { ativo: v }); invalidar(); }
                  catch { toast.error("Não deu para salvar"); }
                }}
              />
              Ativo
            </label>
          </li>
        ))}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const v = novo.trim();
          if (!v) return;
          setNovo("");
          try {
            await criarCampo(frente, v, campos.length + 1);
            invalidar();
          } catch {
            toast.error("Não deu para criar o campo");
          }
        }}
      >
        <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nome do campo novo" className="h-8 text-sm" />
        <Button type="submit" variant="outline" size="sm" className="h-8 gap-1">
          <Plus className="size-4" /> Adicionar
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Campo desativado para de aparecer nas atas novas, mas continua visível nos meses antigos onde já tinha texto.
        Renomear muda o nome em todos os meses de uma vez, passado e futuro.
      </p>
    </div>
  );
}
