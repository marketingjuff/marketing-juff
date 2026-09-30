import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function CampoData({
  label,
  data,
  hora,
  disabled,
  onChange,
}: {
  label: string;
  data: string | null;
  hora: string | null;
  disabled: boolean;
  onChange: (data: string | null, hora: string | null) => void;
}) {
  const ativo = !!data;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={ativo}
          disabled={disabled}
          aria-label={`Usar ${label.toLowerCase()}`}
          onCheckedChange={(v) => {
            if (v) {
              const hoje = new Date();
              const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
              onChange(iso, null);
            } else {
              onChange(null, null);
            }
          }}
        />
        <Input
          type="date"
          className="h-8 min-w-0 flex-1"
          disabled={disabled || !ativo}
          value={data ?? ""}
          onChange={(e) => onChange(e.target.value || null, e.target.value ? hora : null)}
        />
        <Input
          type="time"
          className="h-8 w-24"
          disabled={disabled || !ativo}
          value={hora ? hora.slice(0, 5) : ""}
          onChange={(e) => onChange(data, e.target.value || null)}
        />
      </div>
      {ativo && !hora ? (
        <p className="pl-6 text-[11px] text-muted-foreground">Sem hora, vale o dia inteiro</p>
      ) : null}
    </div>
  );
}
