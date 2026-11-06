import { describe, expect, test } from "bun:test";
import { ocorreNaData, patchDeFrequencia } from "../src/lib/meudia-recorrencia";

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

describe("patchDeFrequencia", () => {
  const hoje = "2026-11-06";
  test("semanal a partir de livre grava segunda e data de início", () => {
    const p = patchDeFrequencia({ dia_semana: "livre", inicio_em: null }, "semanal", hoje);
    expect(p).toEqual({ frequencia: "semanal", dia_semana: "seg", inicio_em: hoje });
  });
  test("semanal preserva dia válido já escolhido", () => {
    const p = patchDeFrequencia({ dia_semana: "sex", inicio_em: "2026-01-01" }, "semanal", hoje);
    expect(p.dia_semana).toBe("sex");
    expect(p.inicio_em).toBe("2026-01-01");
  });
  test("livre limpa o dia da semana", () => {
    expect(patchDeFrequencia({ dia_semana: "qua" }, "livre", hoje)).toEqual({ frequencia: "livre", dia_semana: "livre" });
  });
  test("intervalo limita os dias entre 1 e 365", () => {
    expect(patchDeFrequencia({ intervalo_dias: 0 }, "intervalo", hoje).intervalo_dias).toBe(1);
    expect(patchDeFrequencia({ intervalo_dias: 999 }, "intervalo", hoje).intervalo_dias).toBe(365);
  });
  test("mensal e dia útil recebem padrões válidos", () => {
    expect(patchDeFrequencia({}, "mensal", hoje).dia_mes).toBe(1);
    expect(patchDeFrequencia({}, "dia_util", hoje).dia_util).toBe(1);
  });
  test("último dia útil marca o dia coerente", () => {
    expect(patchDeFrequencia({}, "ultimo_dia_util", hoje).dia_semana).toBe("ultimo_dia_util");
  });
});