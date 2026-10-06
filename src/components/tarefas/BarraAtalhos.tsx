import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { masterDoCaminho } from "@/config/navigation";
import {
  CHAVE_BARRA,
  MIME_ATALHO,
  atalhosBarraQueryOptions,
  criarAtalhoPagina,
  criarAtalhoQuadro,
  excluirAtalhoPagina,
  limparRotulo,
  renomearAtalho,
  reordenarAtalhos,
  type AtalhoBarra,
  type ConteudoArrasto,
} from "@/lib/atalhos-paginas";

const CINZA = "#b3b3b3";
const MIME_MOVER = "application/x-juff-atalho-mover";

/** Cor do anel: hexadecimal minúsculo; claro demais vira cinza. */
function corAnel(hex: string | null | undefined): string {
  const h = (hex ?? "").toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(h)) return CINZA;
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  return lum > 0.93 ? CINZA : h;
}

function corDoAtalho(a: AtalhoBarra): string {
  if (a.quadro_id) return corAnel(a.quadro_cor);
  return corAnel(a.destino ? masterDoCaminho(a.destino.split("?")[0]!)?.cor : null);
}

/** Fundo bem clarinho: tingido com a cor do quadro; cinza quase branco nos demais. */
function fundoDoAtalho(a: AtalhoBarra): string {
  const cor = corDoAtalho(a);
  if (a.quadro_id && cor !== CINZA) return `color-mix(in srgb, ${cor} 10%, #ffffff)`;
  return "#f4f4f5";
}

export function BarraAtalhos() {
  const queryClient = useQueryClient();
  const { data: itens = [] } = useQuery(atalhosBarraQueryOptions);
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const [arrastando, setArrastando] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const movendo = useRef<string | null>(null);

  useEffect(() => {
    const ini = (e: DragEvent) => {
      const t = e.dataTransfer?.types ?? [];
      if (t.includes(MIME_ATALHO) && !t.includes(MIME_MOVER)) setArrastando(true);
    };
    const fim = () => { setArrastando(false); setSobre(false); movendo.current = null; };
    document.addEventListener("dragstart", ini);
    document.addEventListener("dragend", fim);
    document.addEventListener("drop", fim);
    return () => {
      document.removeEventListener("dragstart", ini);
      document.removeEventListener("dragend", fim);
      document.removeEventListener("drop", fim);
    };
  }, []);

  const atual = () => queryClient.getQueryData<AtalhoBarra[]>(CHAVE_BARRA) ?? [];
  const invalidar = () => void queryClient.invalidateQueries({ queryKey: CHAVE_BARRA });

  function soltar(e: React.DragEvent) {
    e.preventDefault();
    setSobre(false);
    setArrastando(false);
    if (e.dataTransfer.types.includes(MIME_MOVER)) return;
    const bruto = e.dataTransfer.getData(MIME_ATALHO);
    if (!bruto) return;
    let c: ConteudoArrasto;
    try { c = JSON.parse(bruto); } catch { return; }
    const anterior = atual();
    const posicao = anterior.length ? Math.max(...anterior.map((a) => a.posicao)) + 1 : 0;
    let promessa: Promise<void>;
    let novo: AtalhoBarra;
    if (c.tipo === "quadro") {
      if (anterior.some((a) => a.quadro_id === c.quadro_id)) return;
      novo = { id: `tmp-${c.quadro_id}`, posicao, label: limparRotulo(c.label), destino: null, quadro_id: c.quadro_id, quadro_cor: c.cor ?? null, quadro_arquivado: false };
      promessa = criarAtalhoQuadro(c.quadro_id, novo.label, posicao);
    } else if (c.tipo === "estampa") {
      const destino = `/biblioteca/catalogo-estampas?id=${c.estampa_id}`;
      if (anterior.some((a) => a.destino === destino)) return;
      novo = { id: `tmp-${c.estampa_id}`, posicao, label: limparRotulo(c.label), destino, quadro_id: null, quadro_cor: null, quadro_arquivado: false };
      promessa = criarAtalhoPagina(destino, novo.label, posicao);
    } else if (c.tipo === "combo") {
      const destino = `/biblioteca/catalogo-estampas?visao=combos&combo=${encodeURIComponent(c.codigo)}`;
      if (anterior.some((a) => a.destino === destino)) return;
      novo = { id: `tmp-${c.codigo}`, posicao, label: limparRotulo(c.codigo), destino, quadro_id: null, quadro_cor: null, quadro_arquivado: false };
      promessa = criarAtalhoPagina(destino, novo.label, posicao);
    } else if (c.tipo === "pagina") {
      if (anterior.some((a) => a.destino === c.destino)) return;
      novo = { id: `tmp-${c.destino}`, posicao, label: limparRotulo(c.label), destino: c.destino, quadro_id: null, quadro_cor: null, quadro_arquivado: false };
      promessa = criarAtalhoPagina(c.destino, novo.label, posicao);
    } else return;
    queryClient.setQueryData<AtalhoBarra[]>(CHAVE_BARRA, [...anterior, novo]);
    promessa.then(invalidar).catch(() => {
      queryClient.setQueryData(CHAVE_BARRA, anterior);
      toast.error("Não deu para criar o atalho");
    });
  }

  function remover(a: AtalhoBarra) {
    const anterior = atual();
    queryClient.setQueryData<AtalhoBarra[]>(CHAVE_BARRA, anterior.filter((x) => x.id !== a.id));
    excluirAtalhoPagina(a.id).catch(() => {
      queryClient.setQueryData(CHAVE_BARRA, anterior);
      toast.error("Não deu para remover");
    });
  }

  function moverSobre(alvoId: string) {
    const origem = movendo.current;
    if (!origem || origem === alvoId) return;
    const lista = [...atual()];
    const de = lista.findIndex((a) => a.id === origem);
    const para = lista.findIndex((a) => a.id === alvoId);
    if (de < 0 || para < 0) return;
    const [item] = lista.splice(de, 1);
    lista.splice(para, 0, item!);
    queryClient.setQueryData<AtalhoBarra[]>(CHAVE_BARRA, lista.map((a, i) => ({ ...a, posicao: i })));
  }

  function finalizarMover() {
    if (!movendo.current) return;
    movendo.current = null;
    const lista = atual();
    if (lista.some((a) => a.id.startsWith("tmp-"))) return;
    reordenarAtalhos(lista.map((a) => a.id)).catch(() => {
      invalidar();
      toast.error("Não deu para salvar a ordem");
    });
  }

  function renomear(a: AtalhoBarra, texto: string) {
    setEditando(null);
    const limpo = limparRotulo(texto);
    if (!limpo || limpo === a.label) return;
    const anterior = atual();
    queryClient.setQueryData<AtalhoBarra[]>(CHAVE_BARRA, anterior.map((x) => (x.id === a.id ? { ...x, label: limpo } : x)));
    renomearAtalho(a.id, limpo).catch(() => {
      queryClient.setQueryData(CHAVE_BARRA, anterior);
      toast.error("Não deu para renomear");
    });
  }

  const chip =
    "group relative flex items-center rounded-full border bg-card px-2 py-px text-xs font-normal text-muted-foreground transition-colors hover:text-foreground";

  return (
    <ul
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(MIME_ATALHO)) return;
        e.preventDefault();
        if (e.dataTransfer.types.includes(MIME_MOVER)) return;
        e.dataTransfer.dropEffect = "copy";
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={soltar}
      className={cn(
        "flex min-h-8 flex-wrap items-center gap-1 rounded-md py-1.5 transition-colors",
        arrastando && "outline-dashed outline-1 outline-primary",
        sobre && "bg-primary-soft",
      )}
    >
      {itens.map((a) => {
        const [destinoPath, destinoQs] = (a.destino ?? "").split("?");
        const destinoSearch = destinoQs ? Object.fromEntries(new URLSearchParams(destinoQs)) : undefined;
        const ativo = a.quadro_id
          ? caminho === `/tarefas/quadros/${a.quadro_id}`
          : caminho === destinoPath;
        const estilo = { borderColor: corDoAtalho(a), backgroundColor: fundoDoAtalho(a) };
        const classe = cn(chip, "bg-transparent", ativo && "text-primary");
        return (
          <li
            key={a.id}
            draggable={editando !== a.id}
            onDragStart={(e) => {
              movendo.current = a.id;
              e.dataTransfer.setData(MIME_ATALHO, JSON.stringify({ tipo: "mover", id: a.id }));
              e.dataTransfer.setData(MIME_MOVER, a.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnter={() => moverSobre(a.id)}
            onDragEnd={finalizarMover}
            onDoubleClick={(e) => { e.preventDefault(); setEditando(a.id); }}
          >
            {editando === a.id ? (
              <span className={classe} style={estilo}>
                <input
                  autoFocus
                  defaultValue={a.label}
                  maxLength={40}
                  size={Math.max(a.label.length, 3)}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => renomear(a, e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditando(null);
                  }}
                  className="bg-transparent text-xs text-foreground outline-none"
                />
              </span>
            ) : (
              <Link
                to={(a.quadro_id ? `/tarefas/quadros/${a.quadro_id}` : destinoPath || "/") as never}
                search={destinoSearch as never}
                title={a.label}
                draggable={false}
                className={classe}
                style={estilo}
              >
                <span className="max-w-[12rem] truncate">{a.label}</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); remover(a); }}
                  aria-label={`Remover ${a.label}`}
                  title="Remover da barra"
                  className="absolute -right-1 -top-1 hidden rounded-full border border-border bg-card p-px text-muted-foreground hover:text-destructive group-hover:block"
                >
                  <X className="size-2.5" />
                </button>
              </Link>
            )}
          </li>
        );
      })}
      {itens.length === 0 && !arrastando ? (
        <li className="px-1 text-xs text-muted-foreground/60">Arraste um quadro ou uma aba para cá</li>
      ) : null}
      {arrastando ? (
        <li className="shrink-0 px-2 text-xs text-muted-foreground">Solte aqui para criar um atalho</li>
      ) : null}
    </ul>
  );
}
