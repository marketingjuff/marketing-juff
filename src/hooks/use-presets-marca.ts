import { useQuery } from "@tanstack/react-query";
import { paletaQueryOptions } from "@/lib/biblioteca-marca";

/**
 * Cores pré-definidas dos seletores de cor: a paleta oficial do manual de
 * marca (Biblioteca > Paleta), ativas e fora de rascunho, na ordem de
 * exibição, hex minúsculo.
 */
export function usePresetsMarca(): string[] {
  const { data } = useQuery(paletaQueryOptions);
  return (data ?? []).filter((c) => c.ativo && !c.rascunho).map((c) => c.hex.toLowerCase());
}
