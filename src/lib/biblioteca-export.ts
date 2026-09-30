import {
  ORDEM_TAMANHOS,
  gerarVariacoes,
  nomePai,
  nomeCurto,
  ordenarTamanhos,
  type CorBiblioteca,
  type ProdutoBiblioteca,
} from "@/lib/biblioteca";
import { baixarXlsx, type Aba } from "@/lib/xlsx-simples";

/**
 * Aba 1, uma linha por variação, com o nome oficial e a categoria.
 * Aba 2, uma linha por produto e cor, com uma coluna por tamanho marcada com X.
 */
export function montarAbas(produtos: ProdutoBiblioteca[], cores: CorBiblioteca[]): Aba[] {
  const linhas1: (string | null)[][] = [["NOME OFICIAL DO PRODUTO", "CATEGORIA"]];
  const linhas2: (string | null)[][] = [
    ["PRODUTO", "PRODUTO E-COM", "COR", "CATEGORIA", ...ORDEM_TAMANHOS],
  ];

  for (const p of produtos) {
    const variacoes = gerarVariacoes(p, cores);
    for (const v of variacoes) {
      linhas1.push([v.nome, v.categoria]);
    }

    const tamanhos = ordenarTamanhos(p.tamanhos);
    const porCor = new Map<string, { categoria: string; cor: string }>();
    for (const v of variacoes) {
      if (!porCor.has(v.cor_olist)) porCor.set(v.cor_olist, { categoria: v.categoria, cor: v.cor_olist });
    }
    for (const [corOlist, info] of porCor) {
      linhas2.push([
        nomeCurto(p),
        nomePai(p),
        corOlist,
        info.categoria,
        ...ORDEM_TAMANHOS.map((t) => (tamanhos.includes(t) ? "X" : "")),
      ]);
    }
  }

  return [
    { nome: "NOMES OFICIAIS", linhas: linhas1 },
    { nome: "RESUMO", linhas: linhas2 },
  ];
}

export async function exportarProduto(p: ProdutoBiblioteca, cores: CorBiblioteca[]) {
  await baixarXlsx(`Juff ${nomeCurto(p)}`, montarAbas([p], cores));
}

export async function exportarTodos(produtos: ProdutoBiblioteca[], cores: CorBiblioteca[]) {
  const ativos = produtos.filter((p) => p.ativo);
  await baixarXlsx("Juff produtos Olist", montarAbas(ativos, cores));
}
