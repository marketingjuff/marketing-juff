import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn } from "@/lib/utils";
import { FUNDOS_QUADRO, fundoCss, type FundoTipo } from "@/lib/tarefas";

export type FundoValor = { fundo_tipo: FundoTipo; fundo_cor1: string; fundo_cor2: string };

export function FundoPicker({
  value,
  onChange,
}: {
  value: FundoValor;
  onChange: (v: FundoValor) => void;
}) {
  const degrade = value.fundo_tipo === "degrade";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FUNDOS_QUADRO.map((f) => {
          const ativo = f.cor1 === value.fundo_cor1 && f.cor2 === value.fundo_cor2;
          return (
            <button
              key={f.nome}
              type="button"
              title={f.nome}
              aria-label={`Fundo ${f.nome}`}
              onClick={() => onChange({ ...value, fundo_cor1: f.cor1, fundo_cor2: f.cor2 })}
              className={cn(
                "size-8 rounded-full border-2 transition-transform hover:scale-110",
                ativo ? "border-foreground" : "border-transparent",
              )}
              style={{
                background: fundoCss({ fundo_tipo: value.fundo_tipo, fundo_cor1: f.cor1, fundo_cor2: f.cor2 }),
              }}
            />
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className={cn(!degrade && "font-medium")}>Cor sólida</span>
        <Switch
          checked={degrade}
          onCheckedChange={(c) => onChange({ ...value, fundo_tipo: c ? "degrade" : "solida" })}
        />
        <span className={cn(degrade && "font-medium")}>Degradê</span>
      </label>
      <div className="flex flex-wrap gap-4">
        <ColorPicker
          label={degrade ? "Cor de cima" : "Cor"}
          value={value.fundo_cor1}
          presets={FUNDOS_QUADRO.map((f) => f.cor1)}
          onChange={(h) => onChange({ ...value, fundo_cor1: h })}
        />
        <ColorPicker
          label="Cor de baixo"
          value={value.fundo_cor2}
          disabled={!degrade}
          presets={FUNDOS_QUADRO.map((f) => f.cor2)}
          onChange={(h) => onChange({ ...value, fundo_cor2: h })}
        />
      </div>
      <div className="h-10 rounded-lg border border-border" style={{ background: fundoCss(value) }} />
    </div>
  );
}
