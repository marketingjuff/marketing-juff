import { describe, expect, test } from "bun:test";
import { ocorreNaData } from "../src/lib/meudia-recorrencia";

const base = { dia_semana: "seg", inicio_em: "2026-10-01" };
describe("frequências do Meu dia", () => {
  test("diária repete em dias úteis e ignora feriados", () => {
    const r = { ...base, frequencia: "diaria" as const };
    expect(ocorreNaData(r, "2026-10-02", {})).toBe(true);
    expect(ocorreNaData(r, "2026-10-03", {})).toBe(false);
    expect(ocorreNaData(r, "2026-10-12", { "2026-10-12": "Feriado" })).toBe(false);
  });
  test("semanal respeita o dia escolhido", () => {
    expect(ocorreNaData({ ...base, frequencia: "semanal" }, "2026-10-05", {})).toBe(true);
    expect(ocorreNaData({ ...base, frequencia: "semanal" }, "2026-10-06", {})).toBe(false);
  });
  test("quinzenal repete a cada 14 dias desde o início", () => {
    expect(ocorreNaData({ ...base, frequencia: "quinzenal" }, "2026-10-15", {})).toBe(true);
    expect(ocorreNaData({ ...base, frequencia: "quinzenal" }, "2026-10-08", {})).toBe(false);
  });
  test("a cada X dias respeita o intervalo configurado", () => {
    expect(ocorreNaData({ ...base, frequencia: "intervalo", intervalo_dias: 5 }, "2026-10-06", {})).toBe(true);
    expect(ocorreNaData({ ...base, frequencia: "intervalo", intervalo_dias: 5 }, "2026-10-07", {})).toBe(false);
  });
  test("mensal repete no dia configurado", () => {
    expect(ocorreNaData({ ...base, frequencia: "mensal", dia_mes: 15 }, "2026-10-15", {})).toBe(true);
    expect(ocorreNaData({ ...base, frequencia: "mensal", dia_mes: 15 }, "2026-10-16", {})).toBe(false);
  });
  test("Xº dia útil ignora fim de semana e feriados", () => {
    const r = { ...base, frequencia: "dia_util" as const, dia_util: 3 };
    expect(ocorreNaData(r, "2026-10-06", { "2026-10-02": "Feriado" })).toBe(true);
    expect(ocorreNaData(r, "2026-10-05", { "2026-10-02": "Feriado" })).toBe(false);
  });
  test("preserva os recorrentes semanais antigos", () => {
    expect(ocorreNaData({ dia_semana: "sex" }, "2026-10-02", {})).toBe(true);
    expect(ocorreNaData({ dia_semana: "sex" }, "2026-10-01", {})).toBe(false);
  });
});