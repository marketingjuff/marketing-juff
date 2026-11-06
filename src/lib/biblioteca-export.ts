import {
  ROTULO_NIVEL,
  nomeCurto,
  ordenarTamanhos,
  tamanhoOlist,
  variacoesDaVariante,
  variantesDoProduto,
  type CorBiblioteca,
  type EstiloNome,
  type NivelProduto,
  type ProdutoBiblioteca,
  type TamanhoOlist,
} from "@/lib/biblioteca";
import { baixarXlsx, type Aba } from "@/lib/xlsx-simples";

/**
 * Aba 1, uma coluna só com o nome completo de cada variação.
 * Aba 2, uma linha por produto e cor, com os tamanhos existentes em sequência.
 */
export function montarAbas(
  produtos: ProdutoBiblioteca[],
  cores: CorBiblioteca[],
  estilo: EstiloNome = "fantasia",
  nivel: NivelProduto = "n1",
  tamanhosOlist: TamanhoOlist[] = [],
): Aba[] {
  const linhas1: (string | null)[][] = [];
  const linhas2: (string | null)[][] = [];

  for (const p of produtos) {
    for (const vr of variantesDoProduto(p, nivel, estilo)) {
      const variacoes = variacoesDaVariante(vr, cores, estilo, tamanhosOlist);
      if (vr.exemplo) {
        linhas1.push([vr.nome]);
        continue;
      }
      for (const v of variacoes) linhas1.push([v.nome]);

      const tamanhos = ordenarTamanhos(vr.tamanhos).map((t) =>
        estilo === "olist" ? tamanhoOlist(t, tamanhosOlist) : t,
      );
      const vistas = new Set<string>();
      for (const v of variacoes) {
        const corTexto = estilo === "olist" ? v.cor_olist || v.cor : v.cor;
        if (vistas.has(corTexto)) continue;
        vistas.add(corTexto);
        linhas2.push([`${vr.nome} ${corTexto}`, ...tamanhos]);
      }
    }
  }

  return [
    { nome: "NOMES", linhas: linhas1 },
    { nome: "RESUMO", linhas: linhas2 },
  ];
}

export async function exportarXlsx(
  produtos: ProdutoBiblioteca[],
  cores: CorBiblioteca[],
  estilo: EstiloNome,
  nivel: NivelProduto = "n1",
  tamanhosOlist: TamanhoOlist[] = [],
) {
  const sufixo = estilo === "olist" ? "nomes Olist" : "nomes fantasia";
  await baixarXlsx(`Juff produtos ${sufixo} ${ROTULO_NIVEL[nivel]}`, montarAbas(produtos, cores, estilo, nivel, tamanhosOlist));
}

export async function exportarProduto(
  p: ProdutoBiblioteca,
  cores: CorBiblioteca[],
  estilo: EstiloNome = "fantasia",
  nivel: NivelProduto = "n1",
  tamanhosOlist: TamanhoOlist[] = [],
) {
  await baixarXlsx(`Juff ${nomeCurto(p)} ${ROTULO_NIVEL[nivel]}`, montarAbas([p], cores, estilo, nivel, tamanhosOlist));
}

export async function exportarTodos(
  produtos: ProdutoBiblioteca[],
  cores: CorBiblioteca[],
  estilo: EstiloNome = "fantasia",
  nivel: NivelProduto = "n1",
  tamanhosOlist: TamanhoOlist[] = [],
) {
  const ativos = produtos.filter((p) => p.ativo);
  await exportarXlsx(ativos, cores, estilo, nivel, tamanhosOlist);
}
