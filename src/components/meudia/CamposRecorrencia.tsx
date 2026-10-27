import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIAS_SEMANA, type ConfigRecorrente } from "@/lib/meudia";
import { FREQUENCIAS, type Frequencia } from "@/lib/meudia-recorrencia";

export function CamposRecorrencia({ valor, onChange, disabled }: { valor: ConfigRecorrente; onChange: (v: ConfigRecorrente) => void; disabled: boolean }) {
  const mudar = (v: ConfigRecorrente) => onChange({ ...valor, ...v });
  const frequencia = valor.frequencia ?? "livre";
  return <div className="grid grid-cols-2 gap-3">
    <div className="col-span-2 space-y-1">
      <Label htmlFor="rec-frequencia">Frequência</Label>
      <Select value={frequencia} disabled={disabled} onValueChange={(v) => mudar({ frequencia: v as Frequencia })}>
        <SelectTrigger id="rec-frequencia"><SelectValue /></SelectTrigger>
        <SelectContent>{FREQUENCIAS.map((f) => <SelectItem key={f.valor} value={f.valor}>{f.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    {frequencia !== "livre" ? <div className="space-y-1"><Label htmlFor="rec-inicio">A partir de</Label><Input id="rec-inicio" type="date" value={valor.inicio_em ?? ""} disabled={disabled} onChange={(e) => mudar({ inicio_em: e.target.value })} required /></div> : null}
    {frequencia === "semanal" ? <div className="space-y-1"><Label htmlFor="rec-semana">Dia da semana</Label><Select value={valor.dia_semana === "livre" ? "seg" : valor.dia_semana ?? "seg"} disabled={disabled} onValueChange={(v) => mudar({ dia_semana: v as ConfigRecorrente["dia_semana"] })}><SelectTrigger id="rec-semana"><SelectValue /></SelectTrigger><SelectContent>{DIAS_SEMANA.filter((d) => d.valor !== "livre" && d.valor !== "ultimo_dia_util").map((d) => <SelectItem key={d.valor} value={d.valor}>{d.label}</SelectItem>)}</SelectContent></Select></div> : null}
    {frequencia === "intervalo" || frequencia === "mensal" || frequencia === "dia_util" || frequencia === "livre" ? <div className="space-y-1">
      <Label htmlFor="rec-numero">{frequencia === "intervalo" ? "A cada quantos dias" : frequencia === "mensal" ? "Dia do mês" : frequencia === "dia_util" ? "Qual dia útil" : "Vezes por mês"}</Label>
      <Input id="rec-numero" type="number" min={1} max={frequencia === "dia_util" ? 23 : frequencia === "intervalo" ? undefined : 31} required disabled={disabled} value={(frequencia === "intervalo" ? valor.intervalo_dias : frequencia === "mensal" ? valor.dia_mes : frequencia === "dia_util" ? valor.dia_util : valor.vezes_mes) ?? 1} onChange={(e) => mudar({ [frequencia === "intervalo" ? "intervalo_dias" : frequencia === "mensal" ? "dia_mes" : frequencia === "dia_util" ? "dia_util" : "vezes_mes"]: Number(e.target.value) })} />
    </div> : null}
    <div className="space-y-1"><Label htmlFor="rec-blocos">Blocos</Label><Select value={String(valor.blocos ?? 1)} disabled={disabled} onValueChange={(v) => mudar({ blocos: Number(v) })}><SelectTrigger id="rec-blocos"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n === 4 ? "Dia inteiro" : `${n} bloco${n > 1 ? "s" : ""}`}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-1"><Label htmlFor="rec-hora">Horário</Label><Input id="rec-hora" type="time" value={valor.hora?.slice(0, 5) ?? ""} disabled={disabled} onChange={(e) => mudar({ hora: e.target.value || null })} /></div>
  </div>;
}