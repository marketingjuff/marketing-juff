/** A consulta de produtos inclui cores vinculadas; medidas e nomes Olist têm caches próprios. */
export const CATALOGO_CONSULTAS = {
  biblioteca_produtos: [["biblioteca", "produtos"]],
  biblioteca_produto_cores: [["biblioteca", "produtos"]],
  biblioteca_cores: [["biblioteca", "cores"]],
  biblioteca_tamanhos_olist: [["biblioteca", "tamanhos-olist"]],
} as const;