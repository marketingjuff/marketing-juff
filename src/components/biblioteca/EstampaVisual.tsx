import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { estampaQueryOptions as coresEstampaQueryOptions, type CorEstampa } from "@/lib/biblioteca-estampa";
import type { ItemCor } from "@/lib/biblioteca-estampas";
import { textoSobreCor } from "@/config/produtos";

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

export type TamanhoCard = "p" | "m" | "g";
export const MEDIDAS_CARD: Record<TamanhoCard, { celula: number; faixa: number; fonte: number; fonteUso: number; fonteUni: number }> = {
  p: { celula: 22, faixa: 28, fonte: 11, fonteUso: 9, fonteUni: 8 },
  m: { celula: 28, faixa: 34, fonte: 12, fonteUso: 10, fonteUni: 9 },
  g: { celula: 34, faixa: 40, fonte: 14, fonteUso: 12, fonteUni: 10 },
};

/** Card de combo: faixa na cor da camiseta (código, uni, uso) e grade de seis colunas com as cores. */
export function CardCombo({ codigo, fundo, itens, porCodigo, tamanho = "m", uso, onVerUso, marcaUni, onClick, title }: {
  codigo: string;
  fundo: string;
  itens: ItemCor[];
  porCodigo: Map<string, CorEstampa>;
  tamanho?: TamanhoCard;
  uso?: number;
  onVerUso?: () => void;
  marcaUni?: boolean;
  onClick?: (() => void) | undefined;
  title?: string;
}) {
  const m = MEDIDAS_CARD[tamanho];
  const bg = HEX.test(fundo) ? fundo : "#888888";
  const txt = textoSobreCor(bg);
  const n = uso ?? 0;
  return (
    <div onClick={onClick} title={title} className={`overflow-hidden rounded-md border border-border bg-background ${onClick ? "cursor-pointer hover:ring-2 hover:ring-primary" : ""}`} style={{ width: m.celula * 6 + 8 }}>
      <div className="flex flex-col justify-center px-1.5" style={{ height: m.faixa, backgroundColor: bg, color: txt }}>
        <div className="flex items-center justify-between leading-none">
          <strong style={{ fontSize: m.fonte }}>{codigo}</strong>
          {marcaUni ? <span className="opacity-60" style={{ fontSize: m.fonteUni }}>uni</span> : null}
        </div>
        {n > 0 ? (
          <button type="button" className="w-fit cursor-pointer text-left leading-tight underline" style={{ fontSize: m.fonteUso, color: txt }} onClick={(e) => { e.stopPropagation(); onVerUso?.(); }}>
            {n} {n === 1 ? "estampa" : "estampas"}
          </button>
        ) : (
          <span className="leading-tight opacity-60" style={{ fontSize: m.fonteUso }}>sem uso</span>
        )}
      </div>
      <div className="grid grid-cols-6 gap-px p-1" style={{ height: m.celula + 8 }}>
        {itens.slice(0, 6).map((i, k) => {
          const h = i.codigo ? hexDoCodigo(porCodigo, i.codigo) : null;
          return (
            <div key={k} className="flex items-center justify-center rounded-sm font-bold" style={{ fontSize: Math.max(7, m.fonteUso - 2), backgroundColor: h ?? "transparent", color: h ? textoSobreCor(h) : undefined }}>
              {i.codigo}
            </div>
          );
        })}
      </div>
    </div>
  );
}
