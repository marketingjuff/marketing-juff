import { useQuery } from "@tanstack/react-query";
import { coresQueryOptions } from "@/lib/biblioteca";

/**
 * Cores pré-definidas dos seletores de cor: as cores oficiais da marca
 * (Biblioteca > Cores), ativas, na ordem de exibição, hex minúsculo.
 */
export function usePresetsMarca(): string[] {
  const { data } = useQuery(coresQueryOptions);
  return (data ?? []).filter((c) => c.ativo).map((c) => c.hex.toLowerCase());
}
