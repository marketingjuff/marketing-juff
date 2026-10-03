import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, Shuffle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
/** Medidas de cada tamanho. O dado é sempre quadrado, do tamanho da largura. */
export const MEDIDAS_CARD: Record<TamanhoCard, {
  lado: number; faixa: number; fatia: number; bolinha: number;
  fonte: number; fonteUso: number; fonteUni: number; fonteCor: number;
}> = {
  p: { lado: 76, faixa: 28, fatia: 14, bolinha: 15, fonte: 10, fonteUso: 9, fonteUni: 8, fonteCor: 9 },
  m: { lado: 100, faixa: 34, fatia: 18, bolinha: 20, fonte: 12, fonteUso: 10, fonteUni: 9, fonteCor: 11 },
  g: { lado: 128, faixa: 40, fatia: 22, bolinha: 26, fonte: 15, fonteUso: 12, fonteUni: 10, fonteCor: 13 },
};

/** Posição de cada bolinha, em porcentagem, igual à face de um dado. */
const FACE_DADO: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[22, 30], [50, 30], [78, 30], [22, 72], [50, 72], [78, 72]],
};

/**
 * Quantas colunas cada fatia ocupa na grade de seis colunas da faixa de baixo.
 * Com uma, duas ou três cores a fatia ocupa as duas linhas inteiras, então
 * todos os cards têm a mesma altura, de uma a seis cores.
 */
const FATIAS_CARD: Record<number, number[]> = {
  1: [6],
  2: [3, 3],
  3: [2, 2, 2],
  4: [3, 3, 3, 3],
  5: [2, 2, 2, 3, 3],
  6: [2, 2, 2, 2, 2, 2],
};

/** Card de combo: faixa de código, dado com bolinhas e faixa de cores. */
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
  const claro = txt === "#ffffff";
  const n = uso ?? 0;
  const q = Math.min(Math.max(itens.length, 1), 6);
  const face = FACE_DADO[q] ?? FACE_DADO[6]!;
  const fatias = FATIAS_CARD[q] ?? FATIAS_CARD[6]!;

  return (
    <div
      onClick={onClick}
      title={title}
      className={`shrink-0 overflow-hidden rounded-md border border-border ${onClick ? "cursor-pointer hover:ring-2 hover:ring-primary" : ""}`}
      style={{ width: m.lado }}
    >
      <div style={{ height: m.faixa + m.lado, backgroundColor: bg, color: txt }}>
        <div
          className="flex flex-col justify-center px-1.5"
          style={{ height: m.faixa, backgroundColor: claro ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)" }}
        >
          <div className="flex items-center justify-between leading-none">
            <strong style={{ fontSize: m.fonte }}>{codigo}</strong>
            {marcaUni ? <span className="opacity-60" style={{ fontSize: m.fonteUni }}>uni</span> : null}
          </div>
          {n > 0 ? (
            <button
              type="button"
              className="w-fit cursor-pointer text-left font-bold leading-tight underline"
              style={{ fontSize: m.fonteUso, color: txt }}
              onClick={(e) => { e.stopPropagation(); onVerUso?.(); }}
            >
              {n} {n === 1 ? "estampa" : "estampas"}
            </button>
          ) : (
            <span className="font-bold leading-tight opacity-60" style={{ fontSize: m.fonteUso }}>sem uso</span>
          )}
        </div>

        <div className="relative" style={{ height: m.lado }}>
          {itens.slice(0, 6).map((it, k) => {
            const pos = face[k] ?? [50, 50];
            const h = it.codigo ? hexDoCodigo(porCodigo, it.codigo) : null;
            return (
              <span
                key={k}
                className="absolute rounded-full border border-black/10"
                style={{
                  width: m.bolinha,
                  height: m.bolinha,
                  left: `${pos[0]}%`,
                  top: `${pos[1]}%`,
                  transform: "translate(-50%,-50%)",
                  backgroundColor: h ?? "transparent",
                  backgroundImage: h ? undefined : "repeating-linear-gradient(45deg,#d4d4d8 0 2px,transparent 2px 5px)",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gridAutoRows: `${m.fatia}px` }}>
        {itens.slice(0, 6).map((it, k) => {
          const h = it.codigo ? hexDoCodigo(porCodigo, it.codigo) : null;
          const cor = h ?? "#d4d4d8";
          return (
            <span
              key={k}
              className="flex items-center justify-center font-bold"
              style={{
                gridColumn: `span ${fatias[k] ?? 2}`,
                gridRow: q <= 3 ? "span 2" : undefined,
                fontSize: m.fonteCor,
                lineHeight: 1,
                backgroundColor: cor,
                color: textoSobreCor(cor),
              }}
            >
              {it.codigo || "?"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Card especial "Cromia": degradê com círculo cromático no centro.
 * Não puxa cor de lugar nenhum — vale para qualquer gênero e qualquer camiseta.
 */
export function CardCromia({ tamanho = "m", title }: { tamanho?: TamanhoCard; title?: string }) {
  const m = MEDIDAS_CARD[tamanho];
  const d = Math.round(m.lado * 0.52);
  return (
    <div
      title={title ?? "Cromia: combo especial, serve para qualquer gênero e qualquer cor de camiseta"}
      className="shrink-0 overflow-hidden rounded-md border border-border"
      style={{ width: m.lado }}
    >
      <div
        style={{
          height: m.faixa + m.lado,
          background: "linear-gradient(135deg, #fdfbfb 0%, #e8e8ec 45%, #dcdce4 100%)",
        }}
      >
        <div
          className="flex flex-col justify-center px-1.5"
          style={{ height: m.faixa, backgroundColor: "rgba(0,0,0,0.06)", color: "#3f3f46" }}
        >
          <strong style={{ fontSize: m.fonte }} className="leading-none">CROMIA</strong>
          <span className="font-bold leading-tight opacity-60" style={{ fontSize: m.fonteUso }}>especial</span>
        </div>
        <div className="relative flex items-center justify-center" style={{ height: m.lado }}>
          <span
            className="absolute rounded-full"
            style={{
              width: d + 10,
              height: d + 10,
              background: "conic-gradient(#f43f5e, #f59e0b, #facc15, #4ade80, #22d3ee, #3b82f6, #a855f7, #f43f5e)",
              filter: "blur(6px)",
              opacity: 0.55,
            }}
          />
          <span
            className="relative rounded-full border border-black/10 shadow-sm"
            style={{
              width: d,
              height: d,
              background: "conic-gradient(#f43f5e, #f59e0b, #facc15, #4ade80, #22d3ee, #3b82f6, #a855f7, #f43f5e)",
            }}
          />
        </div>
      </div>
      <div
        className="flex items-center justify-center font-bold"
        style={{
          height: m.fatia * 2,
          fontSize: m.fonteCor,
          lineHeight: 1,
          background: "linear-gradient(90deg, #f43f5e, #f59e0b, #4ade80, #22d3ee, #a855f7)",
          color: "#ffffff",
          textShadow: "0 1px 2px rgba(0,0,0,0.35)",
        }}
      >
        qualquer cor
      </div>
    </div>
  );
}
/** Altura da faixa de código do card de receita. Menor que a do combo porque não tem linha de uso. */
const FAIXA_RECEITA: Record<TamanhoCard, number> = { p: 18, m: 22, g: 26 };

/**
 * Card de uma receita dentro da estampa. Mesmo desenho do CardCombo, faixa de código em cima,
 * dado no meio e faixa de cores embaixo, com as ações aparecendo por cima do dado no mouse.
 */
export function CardReceita({
  fundo, nomeCor, itens, porCodigo, codigo, temReceita, tamanho = "m", editavel,
  aviso, infantil, publico, podeSalvar, onTrocar, onSortear, onSalvar, onLimpar, onPublico, seletorCombo, cromia,
}: {
  fundo: string;
  nomeCor: string;
  itens: ItemCor[];
  porCodigo: Map<string, CorEstampa>;
  codigo: string | null;
  temReceita: boolean;
  tamanho?: TamanhoCard;
  editavel: boolean;
  aviso?: string | undefined;
  infantil: boolean;
  publico: "menino" | "menina" | null;
  podeSalvar: boolean;
  onTrocar: (ordem: number, c: CorEstampa) => void;
  onSortear: () => void;
  onSalvar: () => void;
  onLimpar: () => void;
  onPublico: (p: "menino" | "menina" | null) => void;
  seletorCombo?: ReactNode;
  /** Receita ligada ao combo especial CROMIA: círculo cromático sobre a cor da camiseta. */
  cromia?: boolean;
}) {
  const m = MEDIDAS_CARD[tamanho];
  const alturaFaixa = FAIXA_RECEITA[tamanho];
  const bg = HEX.test(fundo) ? fundo : "#888888";
  const txt = textoSobreCor(bg);
  const claro = txt === "#ffffff";
  const q = Math.min(Math.max(itens.length, 1), 6);
  const face = FACE_DADO[q] ?? FACE_DADO[6]!;
  const fatias = FATIAS_CARD[q] ?? FATIAS_CARD[6]!;

  const legenda = [
    nomeCor,
    ...itens.map((i) => {
      if (!i.codigo) return "sem cor";
      const c = porCodigo.get(i.codigo.toUpperCase());
      return `${i.codigo}${c?.nome ? ` ${c.nome}` : ""}  ${i.c} ${i.m} ${i.y} ${i.k}`;
    }),
    aviso || "",
  ].filter(Boolean).join("\n");

  return (
    <div
      title={legenda}
      className={`group relative shrink-0 overflow-hidden rounded-md border ${temReceita ? "border-border" : "border-dashed border-muted-foreground/50"} ${aviso ? "ring-2 ring-amber-500" : ""}`}
      style={{ width: m.lado }}
    >
      <div style={{ backgroundColor: bg, color: txt }}>
        <div
          className="flex items-center justify-between px-1.5 leading-none"
          style={{ height: alturaFaixa, backgroundColor: claro ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)" }}
        >
          <strong style={{ fontSize: m.fonte }}>{codigo ?? (temReceita ? "sem código" : "")}</strong>
          {infantil && publico ? (
            <span className="uppercase opacity-70" style={{ fontSize: m.fonteUni }}>{publico === "menino" ? "men" : "mna"}</span>
          ) : null}
        </div>

        <div className="relative" style={{ height: m.lado }}>
          {cromia ? (
            <>
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: m.bolinha * 1.6,
                  height: m.bolinha * 1.6,
                  background: "conic-gradient(#f43f5e, #f59e0b, #facc15, #4ade80, #22d3ee, #3b82f6, #a855f7, #f43f5e)",
                  filter: "blur(5px)",
                  opacity: 0.6,
                }}
              />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10 shadow-sm"
                style={{
                  width: m.bolinha * 1.3,
                  height: m.bolinha * 1.3,
                  background: "conic-gradient(#f43f5e, #f59e0b, #facc15, #4ade80, #22d3ee, #3b82f6, #a855f7, #f43f5e)",
                }}
              />
            </>
          ) : null}
          {!cromia && itens.slice(0, 6).map((it, k) => {
            const pos = face[k] ?? [50, 50];
            const h = it.codigo ? hexDoCodigo(porCodigo, it.codigo) : null;
            return (
              <span
                key={k}
                className="absolute rounded-full border border-black/10"
                style={{
                  width: m.bolinha,
                  height: m.bolinha,
                  left: `${pos[0]}%`,
                  top: `${pos[1]}%`,
                  transform: "translate(-50%,-50%)",
                  backgroundColor: h ?? "transparent",
                  backgroundImage: h ? undefined : "repeating-linear-gradient(45deg,#d4d4d8 0 2px,transparent 2px 5px)",
                }}
              />
            );
          })}

          {editavel ? (
            <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1.5 bg-black/55 text-white group-hover:flex group-has-[[data-state=open]]:flex">
              <div className="flex items-center gap-2">
                {seletorCombo}
                <button type="button" title="Embaralhar" className="rounded p-0.5 hover:bg-white/20" onClick={onSortear}>
                  <Shuffle className="size-4" />
                </button>
                {podeSalvar ? (
                  <button type="button" title="Salvar combo" className="rounded p-0.5 hover:bg-white/20" onClick={onSalvar}>
                    <Save className="size-4" />
                  </button>
                ) : null}
                {temReceita ? (
                  <button type="button" title="Limpar receita" className="rounded p-0.5 hover:bg-white/20" onClick={onLimpar}>
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
              {infantil && temReceita ? (
                <div className="flex gap-1">
                  {(["menino", "menina"] as const).map((pb) => (
                    <button
                      key={pb}
                      type="button"
                      className={`rounded px-1.5 py-0.5 text-[9px] uppercase leading-none ${publico === pb ? "bg-white text-black" : "border border-white/50"}`}
                      onClick={() => onPublico(publico === pb ? null : pb)}
                    >
                      {pb}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gridAutoRows: `${m.fatia}px` }}>
        {itens.slice(0, 6).map((it, k) => {
          const h = it.codigo ? hexDoCodigo(porCodigo, it.codigo) : null;
          const cor = h ?? "#d4d4d8";
          const estilo = {
            gridColumn: `span ${fatias[k] ?? 2}`,
            gridRow: q <= 3 ? "span 2" : undefined,
            fontSize: m.fonteCor,
            lineHeight: 1,
            backgroundColor: cor,
            color: textoSobreCor(cor),
          } as const;
          if (!editavel) {
            return (
              <span key={k} className="flex items-center justify-center font-bold" style={estilo}>
                {it.codigo || "?"}
              </span>
            );
          }
          return (
            <Popover key={k}>
              <PopoverTrigger asChild>
                <button type="button" className="flex items-center justify-center font-bold hover:brightness-110" style={estilo}>
                  {it.codigo || "?"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <EscolherCorEstampa onEscolher={(c) => onTrocar(k, c)} />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
