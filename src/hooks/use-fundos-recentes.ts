import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { quadrosQueryOptions, type FundoTipo } from "@/lib/tarefas";

type FundoRecente = { fundo_tipo: FundoTipo; fundo_cor1: string; fundo_cor2: string };
const CHAVE = "juff:fundos-quadros:recentes:v1";
const EVENTO = "juff:fundos-quadros:salvos";

function chave(f: FundoRecente) {
  return `${f.fundo_tipo}:${f.fundo_cor1}:${f.fundo_tipo === "degrade" ? f.fundo_cor2 : ""}`;
}

function unicos(fundos: FundoRecente[]): FundoRecente[] {
  const vistos = new Set<string>();
  return fundos.filter((f) => {
    const id = chave(f);
    if (vistos.has(id)) return false;
    vistos.add(id);
    return true;
  }).slice(0, 12);
}

function ler(): FundoRecente[] {
  try {
    const dados: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    if (!Array.isArray(dados)) return [];
    return dados.filter((f): f is FundoRecente =>
      f && (f.fundo_tipo === "solida" || f.fundo_tipo === "degrade") &&
      /^#[0-9a-f]{6}$/.test(f.fundo_cor1) && /^#[0-9a-f]{6}$/.test(f.fundo_cor2));
  } catch {
    return [];
  }
}

export function registrarFundoRecente(fundo: FundoRecente) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(unicos([fundo, ...ler()])));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    // Saving a board must still succeed when browser storage is unavailable.
  }
}

export function useFundosRecentes(): FundoRecente[] {
  const { data: quadros = [] } = useQuery(quadrosQueryOptions);
  const [recentes, setRecentes] = useState<FundoRecente[]>([]);
  useEffect(() => {
    const atualizar = () => setRecentes(ler());
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return unicos([...recentes, ...quadros.map(({ fundo_tipo, fundo_cor1, fundo_cor2 }) => ({ fundo_tipo, fundo_cor1, fundo_cor2 }))]);
}