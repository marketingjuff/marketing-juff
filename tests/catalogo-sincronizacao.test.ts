import { describe, expect, test } from "bun:test";
import { CATALOGO_CONSULTAS } from "../src/lib/catalogo-sincronizacao";

describe("cadastro de camisetas compartilhado", () => {
  test("novo modelo ou seus tamanhos atualiza a lista compartilhada de produtos", () => {
    expect(CATALOGO_CONSULTAS.biblioteca_produtos).toEqual([["biblioteca", "produtos"]]);
  });
  test("vínculo de cor atualiza o produto que contém as cores", () => {
    expect(CATALOGO_CONSULTAS.biblioteca_produto_cores).toEqual([["biblioteca", "produtos"]]);
  });
  test("cadastro de cor atualiza os seletores compartilhados", () => {
    expect(CATALOGO_CONSULTAS.biblioteca_cores).toEqual([["biblioteca", "cores"]]);
  });
  test("nome Olist do tamanho atualiza exportações", () => {
    expect(CATALOGO_CONSULTAS.biblioteca_tamanhos_olist).toEqual([["biblioteca", "tamanhos-olist"]]);
  });
});