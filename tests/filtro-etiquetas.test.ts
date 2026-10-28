import { describe, expect, test } from "bun:test";
import { temTodasAsEtiquetas } from "../src/lib/tarefas";

const JUFF_CUSTOM = "etiqueta-juff-custom";
const RD_STATION = "etiqueta-rd-station";
const JUFF_STORE = "etiqueta-juff-store";

const cards = {
  duas: [JUFF_CUSTOM, RD_STATION],
  soCustom: [JUFF_CUSTOM],
  soStore: [JUFF_CUSTOM, JUFF_STORE],
  nada: [] as string[],
};

describe("filtro de etiquetas em pílulas", () => {
  test("sem etiqueta escolhida mostra todos os cards", () => {
    for (const etiquetas of Object.values(cards)) {
      expect(temTodasAsEtiquetas(etiquetas, [])).toBe(true);
    }
  });

  test("uma etiqueta escolhida mostra os cards que a têm", () => {
    expect(temTodasAsEtiquetas(cards.duas, [JUFF_CUSTOM])).toBe(true);
    expect(temTodasAsEtiquetas(cards.soStore, [JUFF_CUSTOM])).toBe(true);
    expect(temTodasAsEtiquetas(cards.nada, [JUFF_CUSTOM])).toBe(false);
  });

  test("duas etiquetas escolhidas exigem as duas juntas", () => {
    const filtro = [JUFF_CUSTOM, RD_STATION];
    expect(temTodasAsEtiquetas(cards.duas, filtro)).toBe(true);
    expect(temTodasAsEtiquetas(cards.soCustom, filtro)).toBe(false);
    expect(temTodasAsEtiquetas(cards.soStore, filtro)).toBe(false);
    expect(temTodasAsEtiquetas(cards.nada, filtro)).toBe(false);
  });

  test("a ordem em que as etiquetas foram clicadas não muda o resultado", () => {
    expect(temTodasAsEtiquetas(cards.duas, [RD_STATION, JUFF_CUSTOM])).toBe(
      temTodasAsEtiquetas(cards.duas, [JUFF_CUSTOM, RD_STATION]),
    );
  });
});
