import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NOMES_MES, type RelatoDia } from "@/lib/meudia";

export function Diario({
  dias,
  relatos,
  onGravar,
}: {
  dias: string[];
  relatos: Record<string, RelatoDia>;
  onGravar: (data: string, modo: "P" | "HO" | null, texto: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Diário</h2>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {dias.map((d) => {
          const r = relatos[d];
          const modo = r?.modo ?? null;
          const dia = Number(d.slice(8, 10));
          const mes = Number(d.slice(5, 7));
          return (
            <li key={d} className="flex flex-wrap items-start gap-2 p-2">
              <span className="w-20 shrink-0 pt-1.5 text-xs text-muted-foreground">
                {dia} {NOMES_MES[mes - 1].slice(0, 3).toLowerCase()}
              </span>
              <div className="flex shrink-0 overflow-hidden rounded border border-border">
                {(["P", "HO"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onGravar(d, modo === m ? null : m, r?.texto ?? "")}
                    className={cn(
                      "px-2 py-1 text-[11px] font-medium transition-colors",
                      modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                    title={m === "P" ? "Presencial" : "Remoto"}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <Textarea
                defaultValue={r?.texto ?? ""}
                rows={1}
                placeholder="O que aconteceu neste dia"
                className="min-w-[14rem] flex-1 text-sm"
                onBlur={(e) => {
                  if (e.target.value !== (r?.texto ?? "")) onGravar(d, modo, e.target.value);
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
