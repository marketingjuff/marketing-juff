import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileQueryOptions } from "@/lib/auth";
import { diasFaixaTopoQueryOptions, salvarDiasFaixaTopo } from "@/lib/tarefas";

export function PainelCalendario() {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQueryOptions);
  const { data: atual = 20 } = useQuery(diasFaixaTopoQueryOptions);
  const [valor, setValor] = useState(String(atual));
  const [salvando, setSalvando] = useState(false);
  const podeEditar = profile?.role === "admin" || profile?.role === "gestor";

  useEffect(() => setValor(String(atual)), [atual]);

  const n = Number(valor);
  const valido = Number.isInteger(n) && n >= 5 && n <= 90;

  async function salvar() {
    if (!valido || !podeEditar) return;
    const chave = diasFaixaTopoQueryOptions.queryKey;
    const antes = qc.getQueryData<number>(chave);
    qc.setQueryData(chave, n);
    setSalvando(true);
    try {
      await salvarDiasFaixaTopo(n);
      toast.success("Calendário atualizado");
    } catch (e) {
      qc.setQueryData(chave, antes);
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
      void qc.invalidateQueries({ queryKey: chave });
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <CalendarRange className="size-4 text-primary" /> Calendário
      </h2>
      <p className="text-sm text-muted-foreground">
        Cards com período acima deste número de dias saem da grade e vão para a faixa fixa no topo do mês.
      </p>
      {!podeEditar ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Você está em modo de consulta. Pode ver, mas não alterar.
        </p>
      ) : null}
      <div className="flex items-start gap-2">
        <div>
          <Input
            type="number"
            min={5}
            max={90}
            value={valor}
            disabled={!podeEditar}
            onChange={(e) => setValor(e.target.value)}
            className="h-9 w-28"
            aria-invalid={!valido}
          />
          {!valido ? <p className="mt-1 text-xs text-destructive">Use um número de 5 a 90 dias.</p> : null}
        </div>
        <span className="pt-2 text-sm text-muted-foreground">dias</span>
        {podeEditar ? (
          <Button size="sm" className="h-9" disabled={!valido || salvando || n === atual} onClick={salvar}>
            Salvar
          </Button>
        ) : null}
      </div>
    </section>
  );
}
