import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { estampaQueryOptions as coresEstampaQueryOptions, type CorEstampa } from "@/lib/biblioteca-estampa";
import type { ItemCor } from "@/lib/biblioteca-estampas";

const HEX = /^#[0-9a-f]{6}$/;

/** Mapa código -> cor de estampa, para a bolinha. */
export function useCoresEstampa() {
  const { data = [] } = useQuery(coresEstampaQueryOptions);
  const porCodigo = useMemo(() => new Map(data.map((c) => [c.codigo.toUpperCase(), c])), [data]);
  return { lista: data, porCodigo };
}

export function hexDoCodigo(porCodigo: Map<string, CorEstampa>, codigo: string) {
  const h = porCodigo.get(codigo.toUpperCase())?.hex;
  return h && HEX.test(h) ? h : null;
}

export function Bolinha({ hex, tamanho = 14 }: { hex: string | null; tamanho?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full border border-border"
      style={{
        width: tamanho,
        height: tamanho,
        backgroundColor: hex ?? "transparent",
        backgroundImage: hex ? undefined : "repeating-linear-gradient(45deg,#d4d4d8 0 2px,transparent 2px 5px)",
      }}
    />
  );
}

/** Retângulo na cor da camiseta com uma bolinha por cor da estampa. */
export function Amostra({ fundo, itens, porCodigo }: { fundo: string; itens: ItemCor[]; porCodigo: Map<string, CorEstampa> }) {
  return (
    <div className="flex h-8 min-w-16 items-center gap-1 rounded-md border border-border px-2" style={{ backgroundColor: HEX.test(fundo) ? fundo : "#888888" }}>
      {itens.map((i, n) => (
        <Bolinha key={n} hex={i.codigo ? hexDoCodigo(porCodigo, i.codigo) : null} />
      ))}
    </div>
  );
}

/** Lista com busca por código para escolher uma cor de estampa. */
export function EscolherCorEstampa({ onEscolher }: { onEscolher: (c: CorEstampa) => void }) {
  const { lista } = useCoresEstampa();
  const [busca, setBusca] = useState("");
  const q = busca.trim().toUpperCase();
  const filtradas = lista.filter((c) => c.ativo && (!q || c.codigo.toUpperCase().includes(q) || c.nome.toUpperCase().includes(q)));
  return (
    <div className="space-y-2">
      <Input autoFocus placeholder="Buscar código" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-8" />
      <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
        {filtradas.map((c) => (
          <button
            key={c.id}
            type="button"
            title={`${c.codigo}  ${c.c} ${c.m} ${c.y} ${c.k}`}
            onClick={() => onEscolher(c)}
            className="flex aspect-square items-center justify-center rounded text-[10px] font-bold hover:outline hover:outline-2 hover:outline-primary"
            style={{ backgroundColor: HEX.test(c.hex) ? c.hex : "#888888", color: corTexto(c.hex) }}
          >
            {c.codigo}
          </button>
        ))}
      </div>
    </div>
  );
}

function corTexto(hex: string) {
  if (!HEX.test(hex)) return "#111111";
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "#111111" : "#ffffff";
}
