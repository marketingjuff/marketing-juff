import { IconeCampo } from "@/components/estrategia/IconeCampo";
import { MESES, type CampoEstrategia, type ResumoMes } from "@/lib/estrategia";

export function PanoramaAno({
  ano,
  meses,
  campos,
  mesAtual,
  onAbrir,
}: {
  ano: number;
  meses: ResumoMes[];
  campos: CampoEstrategia[];
  mesAtual: number | null;
  onAbrir: (mes: number) => void;
}) {
  const visiveis = campos.filter((c) => c.ativo && c.no_panorama);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {meses.map((m) => {
        const atual = m.mes === mesAtual;
        return (
          <button
            key={m.mes}
            type="button"
            onClick={() => onAbrir(m.mes)}
            className={
              "min-w-0 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary " +
              (atual ? "border-primary" : "border-border")
            }
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              {MESES[m.mes - 1]}
              {atual ? <span className="text-[10px] font-normal text-primary">mês atual</span> : null}
            </p>

            {!m.existe ? (
              <p className="text-xs text-muted-foreground">Ainda sem nada escrito</p>
            ) : (
              <>
                {visiveis.map((c) => {
                  const v = (m.valores[c.id] ?? "").trim();
                  return (
                    <p
                      key={c.id}
                      className={
                        "flex items-center gap-1.5 truncate py-0.5 text-xs " +
                        (v ? "text-foreground" : "text-muted-foreground")
                      }
                      title={v || "vazio"}
                    >
                      <IconeCampo nome={c.icone} className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{v || "vazio"}</span>
                    </p>
                  );
                })}
                <p className="pt-2 text-[10px] text-muted-foreground">
                  {m.decisoes === 1 ? "1 decisão" : `${m.decisoes} decisões`}
                </p>
              </>
            )}
          </button>
        );
      })}
      <p className="sr-only">Panorama de {ano}</p>
    </div>
  );
}
