/**
 * Catálogo de produto Juff. Qualquer seletor de modelo, tamanho ou cor
 * do Marketing Juff deve usar estas listas, sem resumir nem inventar.
 */

export const MODELOS = [
  "Camiseta",
  "Baby Look",
  "Regata Masculina",
  "Regata Feminina",
  "ML Masculina",
  "ML Feminina",
  "Camiseta Infantil",
  "ML Infantil",
  "Regata Cross",
  "Regata Wing",
  "Regata Move",
  "ML Hide Masculina",
  "ML Hide Feminina",
  "ML Hide Infantil",
  "Regata Breeze",
  "Não Identificado",
] as const;

export const TAMANHOS = ["PP", "P", "M", "G", "GG", "EXG", "EXXG"] as const;

export type Cor = { nome: string; hex: string };

export const CORES: Cor[] = [
  { nome: "amarelo", hex: "#ffe938" },
  { nome: "amarelo flúor", hex: "#e0ff00" },
  { nome: "areia", hex: "#d6d1c9" },
  { nome: "azul índigo", hex: "#4d6694" },
  { nome: "bordô", hex: "#551b2a" },
  { nome: "branco", hex: "#f6f6fb" },
  { nome: "cinza chumbo", hex: "#353439" },
  { nome: "cinza claro", hex: "#585858" },
  { nome: "fúcsia", hex: "#870065" },
  { nome: "laranja", hex: "#e36837" },
  { nome: "laranja ultra", hex: "#fd5f2f" },
  { nome: "marinho", hex: "#1d2546" },
  { nome: "marrom", hex: "#342423" },
  { nome: "menta", hex: "#93a393" },
  { nome: "pink", hex: "#b7357a" },
  { nome: "preto", hex: "#212120" },
  { nome: "roial", hex: "#323db8" },
  { nome: "rosa flúor", hex: "#f51eb1" },
  { nome: "rosa pop", hex: "#e0418e" },
  { nome: "roxo", hex: "#8354b5" },
  { nome: "roxo ultra", hex: "#533189" },
  { nome: "turquesa", hex: "#1581ae" },
  { nome: "verde água", hex: "#a1e1d9" },
  { nome: "verde bandeira", hex: "#2e572d" },
  { nome: "verde militar", hex: "#2a352a" },
  { nome: "vermelho", hex: "#c12b3d" },
];

/** Escolhe texto claro ou escuro para ficar legível sobre a cor da peça. */
export function textoSobreCor(hex: string): "#ffffff" | "#111111" {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? "#111111" : "#ffffff";
}
