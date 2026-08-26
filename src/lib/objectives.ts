import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Objective = {
  id: string;
  nome: string;
  instrucao: string;
  arquivado: boolean;
  created_at: string;
};

export const objectivesQueryOptions = queryOptions({
  queryKey: ["story-objectives"],
  queryFn: fetchObjectives,
});

export async function fetchObjectives(): Promise<Objective[]> {
  const { data, error } = await supabase
    .from("story_objectives")
    .select("id, nome, instrucao, arquivado, created_at")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((o) => ({
    id: o.id,
    nome: o.nome ?? "",
    instrucao: o.instrucao ?? "",
    arquivado: o.arquivado ?? false,
    created_at: o.created_at,
  }));
}

export async function createObjective(nome: string, instrucao: string): Promise<void> {
  const { error } = await supabase
    .from("story_objectives")
    .insert({ nome: nome.trim(), instrucao: instrucao.trim() });
  if (error) throw error;
}

export async function updateObjective(
  id: string,
  values: { nome?: string; instrucao?: string; arquivado?: boolean },
): Promise<void> {
  const { error } = await supabase.from("story_objectives").update(values).eq("id", id);
  if (error) throw error;
}

/** Exclusão real. Só deve ser chamada após a confirmação digitando o nome. */
export async function deleteObjective(id: string): Promise<void> {
  const { error } = await supabase.from("story_objectives").delete().eq("id", id);
  if (error) throw error;
}
