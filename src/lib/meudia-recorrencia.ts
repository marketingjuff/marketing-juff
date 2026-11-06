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

export type DiaSemanaRec = "livre" | "seg" | "ter" | "qua" | "qui" | "sex" | "ultimo_dia_util";

export type PatchFrequencia = {
  frequencia: Frequencia;
  dia_semana: DiaSemanaRec;
  inicio_em?: string;
  intervalo_dias?: number;
  dia_mes?: number;
  dia_util?: number;
};

const DIAS_UTEIS_SEMANA = ["seg", "ter", "qua", "qui", "sex"];

/**
 * Devolve o conjunto coerente de campos ao trocar a frequência de um recorrente.
 * Garante dia da semana válido, data de início quando ela passa a ser obrigatória
 * e números dentro do limite aceito pelo banco.
 */
export function patchDeFrequencia(
  atual: {
    dia_semana?: string | null;
    inicio_em?: string | null;
    intervalo_dias?: number | null;
    dia_mes?: number | null;
    dia_util?: number | null;
  },
  nova: Frequencia,
  hojeIso: string,
): PatchFrequencia {
  const inicio = atual.inicio_em || hojeIso;
  const dia = DIAS_UTEIS_SEMANA.includes(atual.dia_semana ?? "")
    ? (atual.dia_semana as DiaSemanaRec)
    : "seg";
  const limite = (n: number | null | undefined, min: number, max: number) =>
    Math.min(max, Math.max(min, n ?? min));

  if (nova === "livre") return { frequencia: "livre", dia_semana: "livre" };
  if (nova === "semanal") return { frequencia: "semanal", dia_semana: dia, inicio_em: inicio };
  if (nova === "ultimo_dia_util") return { frequencia: "ultimo_dia_util", dia_semana: "ultimo_dia_util", inicio_em: inicio };
  if (nova === "intervalo") return { frequencia: "intervalo", dia_semana: "livre", inicio_em: inicio, intervalo_dias: limite(atual.intervalo_dias, 1, 365) };
  if (nova === "mensal") return { frequencia: "mensal", dia_semana: "livre", inicio_em: inicio, dia_mes: limite(atual.dia_mes, 1, 31) };
  if (nova === "dia_util") return { frequencia: "dia_util", dia_semana: "livre", inicio_em: inicio, dia_util: limite(atual.dia_util, 1, 23) };
  return { frequencia: nova, dia_semana: "livre", inicio_em: inicio };
}