import { describe, expect, it } from "vitest";
import {
  nomePai,
  prefixoVariacao,
  variantesDoProduto,
  type ProdutoBiblioteca,
} from "@/lib/biblioteca";

function produto(patch: Partial<ProdutoBiblioteca> = {}): ProdutoBiblioteca {
  return {
    id: "p1",
    nome_base: "Baby Look",
    tecido: "ThermoAir",
    usa_tecido: true,
    sufixo: "",
    nome_base_olist: "",
    tecido_olist: "",
    sufixo_olist: "",
    usa_sufixo: false,
    usa_xtra: false,
    tamanhos_xtra: ["EXG", "EXXG"],
    xtra_modelo: false,
    xtra_loja: false,
    outlet_modelo: false,
    outlet_loja: false,
    tamanhos: ["P", "M", "G", "GG", "EXG", "EXXG"],
    pontos: [],
    posicao: 1,
    ativo: true,
    cores: [
      { cor_id: "c1", categoria: "Normal" },
      { cor_id: "c2", categoria: "Outlet" },
    ],
    ...patch,
  };
}

describe("taxonomia de três níveis", () => {
  it("sufixo entra colado no nome, sem traço", () => {
    const p = produto({ nome_base: "Manga Longa Masculina", sufixo: "Hide", usa_sufixo: true });
    expect(nomePai(p)).toBe("Manga Longa Masculina ThermoAir Hide");
  });

  it("produto com sufixo pode usar XTRA no nível 1", () => {
    const p = produto({ sufixo: "Hide", usa_sufixo: true, usa_xtra: true });
    expect(prefixoVariacao(p, "EXG")).toBe("Baby Look ThermoAir Hide XTRA");
    expect(prefixoVariacao(p, "P")).toBe("Baby Look ThermoAir Hide");
  });

  it("Baby Look com XTRA na Olist, XTRA e Outlet na loja e MODELO sem separação", () => {
    const p = produto({ usa_xtra: true, xtra_loja: true, outlet_loja: true });

    expect(variantesDoProduto(p, "n1").map((v) => v.nome)).toEqual([
      "Baby Look ThermoAir",
      "Baby Look ThermoAir XTRA",
    ]);

    expect(variantesDoProduto(p, "n2").map((v) => v.nome)).toEqual([
      "MODELO - Juff Store - Baby Look ThermoAir Kit",
    ]);

    expect(variantesDoProduto(p, "n3").map((v) => v.nome)).toEqual([
      "Juff Store - Baby Look ThermoAir Kit Lisas",
      "Juff Store - Baby Look ThermoAir Kit Lisas - XTRA",
      "Juff Store - Baby Look ThermoAir Kit Outlet",
      "Juff Store - Baby Look ThermoAir - Nome da estampa",
    ]);
  });

  it("no nível Juff Store o liso não leva cor de Outlet e o Outlet leva todos os tamanhos", () => {
    const p = produto({ outlet_loja: true });
    const [liso, outlet] = variantesDoProduto(p, "n3");
    expect(liso!.cores).toEqual([{ cor_id: "c1", categoria: "Normal" }]);
    expect(outlet!.cores).toEqual([{ cor_id: "c2", categoria: "Outlet" }]);
    expect(outlet!.tamanhos).toEqual(["P", "M", "G", "GG", "EXG", "EXXG"]);
  });

  it("com todas as chaves desligadas cada nível tem uma linha só com tudo junto", () => {
    const p = produto();
    const n1 = variantesDoProduto(p, "n1");
    const n2 = variantesDoProduto(p, "n2");
    expect(n1).toHaveLength(1);
    expect(n1[0]!.tamanhos).toEqual(["P", "M", "G", "GG", "EXG", "EXXG"]);
    expect(n1[0]!.cores).toHaveLength(2);
    expect(n2).toHaveLength(1);
    expect(n2[0]!.cores).toHaveLength(2);
  });
});
