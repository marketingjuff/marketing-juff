import { differenceInCalendarDays, getDaysInMonth, parseISO } from "date-fns";

export const FREQUENCIAS = [
  { valor: "livre", label: "Livre" },
  { valor: "diaria", label: "Diária (dias úteis)" },
  { valor: "semanal", label: "Semanal" },
  { valor: "quinzenal", label: "Quinzenal (14 dias)" },
  { valor: "intervalo", label: "A cada X dias" },
  { valor: "mensal", label: "Mensal" },
  { valor: "dia_util", label: "Xº dia útil do mês" },
  { valor: "ultimo_dia_util", label: "Último dia útil do mês" },
] as const;
export type Frequencia = typeof FREQUENCIAS[number]["valor"];
export type RegraRecorrente = {
  frequencia?: Frequencia | null;
  inicio_em?: string | null;
  intervalo_dias?: number;
  dia_mes?: number;
  dia_util?: number;
  dia_semana: string;
};
export function frequenciaDoRecorrente(r: RegraRecorrente): Frequencia {
  return r.frequencia ?? (r.dia_semana === "livre" ? "livre" : r.dia_semana === "ultimo_dia_util" ? "ultimo_dia_util" : "semanal");
}
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
export function ocorreNaData(r: RegraRecorrente, data: string, feriados: Record<string, string>): boolean {
  const d = parseISO(data);
  const dia = d.getDay();
  if (dia === 0 || dia === 6 || feriados[data] || (r.inicio_em && data < r.inicio_em)) return false;
  const frequencia = frequenciaDoRecorrente(r);
  if (frequencia === "livre") return false;
  if (frequencia === "diaria") return true;
  if (frequencia === "semanal") return SEMANA[dia] === r.dia_semana;
  if (frequencia === "quinzenal" || frequencia === "intervalo") {
    if (!r.inicio_em) return false;
    const intervalo = frequencia === "quinzenal" ? 14 : Math.max(1, r.intervalo_dias ?? 1);
    return differenceInCalendarDays(d, parseISO(r.inicio_em)) % intervalo === 0;
  }
  if (frequencia === "mensal") return d.getDate() === Math.min(r.dia_mes ?? 1, getDaysInMonth(d));
  const uteis: string[] = [];
  for (let n = 1; n <= getDaysInMonth(d); n++) {
    const candidato = `${data.slice(0, 7)}-${String(n).padStart(2, "0")}`;
    const semana = parseISO(candidato).getDay();
    if (semana !== 0 && semana !== 6 && !feriados[candidato]) uteis.push(candidato);
  }
  return frequencia === "ultimo_dia_util" ? data === uteis.at(-1) : data === uteis[(r.dia_util ?? 1) - 1];
}