import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn } from "@/lib/utils";
import { fundoCss, type FundoTipo } from "@/lib/tarefas";
import { usePresetsMarca } from "@/hooks/use-presets-marca";
import { useFundosRecentes } from "@/hooks/use-fundos-recentes";

export type FundoValor = { fundo_tipo: FundoTipo; fundo_cor1: string; fundo_cor2: string };

export function FundoPicker({
  value,
  onChange,
}: {
  value: FundoValor;
  onChange: (v: FundoValor) => void;
}) {
  const degrade = value.fundo_tipo === "degrade";
  const presetsMarca = usePresetsMarca();
  const recentes = useFundosRecentes();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {recentes.map((f, i) => {
          const ativo = f.fundo_tipo === value.fundo_tipo && f.fundo_cor1 === value.fundo_cor1 && (!degrade || f.fundo_cor2 === value.fundo_cor2);
          const nome = `${f.fundo_tipo === "degrade" ? "Degradê" : "Cor sólida"} ${f.fundo_cor1}${f.fundo_tipo === "degrade" ? ` / ${f.fundo_cor2}` : ""}`;
          return (
            <Button
              key={i}
              variant="ghost"
              size="icon"
              type="button"
              title={nome}
              aria-label={`Fundo salvo ${nome}`}
              aria-pressed={ativo}
              onClick={() => onChange(f)}
              className={cn(
                "size-8 rounded-full border-2 p-0 transition-transform hover:scale-110",
                ativo ? "border-foreground" : "border-transparent",
              )}
              style={{
                background: fundoCss(f),
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
          presets={presetsMarca}
          onChange={(h) => onChange({ ...value, fundo_cor1: h })}
        />
        <ColorPicker
          label="Cor de baixo"
          value={value.fundo_cor2}
          disabled={!degrade}
          presets={presetsMarca}
          onChange={(h) => onChange({ ...value, fundo_cor2: h })}
        />
      </div>
      <div className="h-10 rounded-lg border border-border" style={{ background: fundoCss(value) }} />
    </div>
  );
}
