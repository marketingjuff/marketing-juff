import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CardPublicado, CardStories } from "@/components/estrategia/CardsPublicados";
import {
  atualizarPlanejado, capasQueryOptions, criarPlanejado, excluirPlanejado,
  formatosQueryOptions, planejadosQueryOptions, publicadosQueryOptions,
  type ItemPublicado, type PostPlanejado,
} from "@/lib/calendario-social";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const CHAVE_FILTROS = "social-calendario-filtros";
const CINZA = "#7a828c";
const VERDE = "#2e572d";
const LARANJA = "#e36837";
const ADS = "#d99400";

type Filtro = "plan" | "pub" | "tudo";

function lerFiltros(): { filtro: Filtro; stories: boolean } {
  try {
    const bruto = localStorage.getItem(CHAVE_FILTROS);
    if (bruto) return JSON.parse(bruto) as { filtro: Filtro; stories: boolean };
  } catch { /* navegador sem armazenamento, segue no padrão */ }
  return { filtro: "tudo", stories: true };
}

export function CalendarioSocial({ editavel }: { editavel: boolean }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [{ filtro, stories }, setPrefs] = useState(lerFiltros);
  const qc = useQueryClient();

  const { data: formatos = [] } = useQuery(formatosQueryOptions);
  const { data: planejados = [] } = useQuery(planejadosQueryOptions(ano, mes));
  const { data: publicados = [] } = useQuery(publicadosQueryOptions(ano, mes));

  const paths = useMemo(
    () => publicados.map((p) => p.capa_path).filter(Boolean),
    [publicados],
  );
  const { data: capas = {} } = useQuery(capasQueryOptions(ano, mes, paths));

  // publicações na mesma ordem do calendário (mais antiga primeiro)
  const postsPublicados = useMemo(
    () => publicados.filter((p) => p.tipo === "post"),
    [publicados],
  );

  const chavePlan = ["social", "planejados", ano, mes] as const;

  function gravarPrefs(novo: { filtro: Filtro; stories: boolean }) {
    setPrefs(novo);
    try { localStorage.setItem(CHAVE_FILTROS, JSON.stringify(novo)); } catch { /* sem armazenamento */ }
  }

  const verPlan = filtro === "plan" || filtro === "tudo";
  const verPub = filtro === "pub" || filtro === "tudo";

  // ---------- diálogos ----------
  const [novoDia, setNovoDia] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<PostPlanejado | null>(null);
  const [verItem, setVerItem] = useState<ItemPublicado | null>(null);
  const [verStories, setVerStories] = useState<ItemPublicado[] | null>(null);

  // navegar entre publicações sem fechar o diálogo
  const indicePub = verItem ? postsPublicados.findIndex((p) => p.id === verItem.id) : -1;
  const anterior: ItemPublicado | null = indicePub > 0 ? postsPublicados[indicePub - 1] ?? null : null;
  const proxima: ItemPublicado | null =
    indicePub >= 0 && indicePub < postsPublicados.length - 1
      ? postsPublicados[indicePub + 1] ?? null
      : null;

  const [titulo, setTitulo] = useState("");
  const [formatoId, setFormatoId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [ads, setAds] = useState(false);

  function abrirNovo(dia: string) {
    setTitulo(""); setFormatoId(formatos[0]?.id ?? ""); setDescricao(""); setAds(false);
    setNovoDia(dia);
  }
  function abrirEdicao(p: PostPlanejado) {
    setTitulo(p.titulo); setFormatoId(p.formato_id ?? ""); setDescricao(p.descricao); setAds(p.ads);
    setEdicao(p);
  }

  /** Aplica na tela primeiro, grava depois, desfaz se der erro. */
  function otimista(muda: (lista: PostPlanejado[]) => PostPlanejado[], gravar: () => Promise<unknown>) {
    const antes = qc.getQueryData<PostPlanejado[]>(chavePlan) ?? [];
    qc.setQueryData(chavePlan, muda(antes));
    gravar()
      .then(() => { void qc.invalidateQueries({ queryKey: chavePlan }); })
      .catch(() => { qc.setQueryData(chavePlan, antes); toast.error("Não deu para gravar"); });
  }

  function salvarNovo() {
    if (!novoDia || !titulo.trim()) return;
    const dia = novoDia;
    const corpo = { data: dia, titulo: titulo.trim(), formato_id: formatoId || null, descricao, ads };
    setNovoDia(null);
    otimista(
      (l) => [...l, { id: `tmp-${Date.now()}`, posicao: 999, ...corpo } as PostPlanejado],
      () => criarPlanejado(corpo),
    );
  }

  function salvarEdicao() {
    if (!edicao) return;
    const id = edicao.id;
    const corpo = { titulo: titulo.trim(), formato_id: formatoId || null, descricao, ads };
    setEdicao(null);
    otimista(
      (l) => l.map((p) => (p.id === id ? { ...p, ...corpo } : p)),
      () => atualizarPlanejado(id, corpo),
    );
  }

  function apagar(id: string) {
    setEdicao(null);
    otimista((l) => l.filter((p) => p.id !== id), () => excluirPlanejado(id));
  }

  function soltarEm(dia: string, id: string) {
    otimista(
      (l) => l.map((p) => (p.id === id ? { ...p, data: dia } : p)),
      () => atualizarPlanejado(id, { data: dia }),
    );
  }

  // ---------- grade ----------
  const celulas = useMemo(() => {
    const primeiro = new Date(ano, mes - 1, 1);
    const desloc = (primeiro.getDay() + 6) % 7;
    const ultimo = new Date(ano, mes, 0).getDate();
    const total = Math.ceil((desloc + ultimo) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const n = i - desloc + 1;
      if (n < 1 || n > ultimo) return null;
      return { n, data: `${ano}-${String(mes).padStart(2, "0")}-${String(n).padStart(2, "0")}` };
    });
  }, [ano, mes]);

  function andar(passo: number) {
    const d = new Date(ano, mes - 1 + passo, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  }

  const botao = (chave: Filtro, rotulo: string, cor: string) => (
    <button
      type="button"
      onClick={() => gravarPrefs({ filtro: chave, stories })}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
      style={filtro === chave
        ? { backgroundColor: cor, borderColor: cor, color: "#ffffff" }
        : { borderColor: "var(--border)" }}
    >
      <span className="size-2 rounded-full bg-current" />{rotulo}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Calendário social</h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => andar(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <strong className="min-w-[150px] text-center text-sm capitalize">
            {MESES[mes - 1]} de {ano}
          </strong>
          <Button variant="outline" size="icon" className="size-8" onClick={() => andar(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {botao("plan", "Planejamento", CINZA)}
          {botao("pub", "Publicados", VERDE)}
          {botao("tudo", "Os dois", LARANJA)}
          <button
            type="button"
            onClick={() => gravarPrefs({ filtro, stories: !stories })}
            className="ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={stories
              ? { backgroundColor: ADS, borderColor: ADS, color: "#ffffff" }
              : { borderColor: "var(--border)" }}
          >
            <span className="size-2 rounded-full bg-current" />Stories
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="grid grid-cols-7 border-b border-border">
          {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => (
            <div key={d} className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celulas.map((cel, i) => {
            if (!cel) {
              return <div key={i} className="min-h-[208px] border-b border-r border-border bg-secondary/50 last:border-r-0" />;
            }
            const doDia = planejados.filter((p) => p.data === cel.data);
            const posts = publicados.filter((p) => p.data === cel.data && p.tipo === "post");
            const stos = publicados.filter((p) => p.data === cel.data && p.tipo === "story");
            return (
              <div
                key={cel.data}
                className="group/cel flex min-h-[208px] flex-col gap-1 border-b border-r border-border p-1.5 last:border-r-0"
                onDragOver={(e) => { if (editavel) e.preventDefault(); }}
                onDrop={(e) => {
                  if (!editavel) return;
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) soltarEm(cel.data, id);
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>{cel.n}</span>
                  {editavel ? (
                    <button
                      type="button"
                      className="opacity-0 transition-opacity group-hover/cel:opacity-100"
                      onClick={() => abrirNovo(cel.data)}
                      title="Criar post planejado"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {verPlan
                  ? doDia.map((p) => (
                      <div
                        key={p.id}
                        draggable={editavel}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                        onClick={() => editavel && abrirEdicao(p)}
                        className="flex cursor-pointer items-center gap-1 overflow-hidden rounded border-l-[3px] bg-secondary px-1.5 py-[3px] text-[11px] leading-tight"
                        style={{ borderLeftColor: CINZA }}
                      >
                        <span className="flex-1 truncate">{p.titulo}</span>
                        {p.ads ? (
                          <span className="rounded-[2px] px-[3px] text-[8.5px] font-extrabold text-white" style={{ backgroundColor: ADS }}>
                            ads
                          </span>
                        ) : null}
                      </div>
                    ))
                  : null}

                {verPub && (posts.length || (stories && stos.length)) ? (
                  <div className="mt-0.5 flex flex-wrap gap-[5px]">
                    {posts.map((p) => (
                      <CardPublicado key={p.id} item={p} capa={capas[p.capa_path]} onAbrir={setVerItem} />
                    ))}
                    {stories ? <CardStories itens={stos} capas={capas} onAbrir={setVerStories} /> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* criar */}
      <Dialog open={!!novoDia} onOpenChange={(o) => !o && setNovoDia(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Novo post planejado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={formatoId}
              onChange={(e) => setFormatoId(e.target.value)}
            >
              {formatos.filter((f) => f.ativo).map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
            <Textarea placeholder="Descrição do post" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} />
              Vai ser impulsionado (Ads)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoDia(null)}>Cancelar</Button>
            <Button onClick={salvarNovo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* editar */}
      <Dialog open={!!edicao} onOpenChange={(o) => !o && setEdicao(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Post planejado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={formatoId}
              onChange={(e) => setFormatoId(e.target.value)}
            >
              {formatos.filter((f) => f.ativo).map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} />
              Vai ser impulsionado (Ads)
            </label>
          </div>
          <DialogFooter className="justify-between">
            <Button variant="ghost" onClick={() => edicao && apagar(edicao.id)}>
              <Trash2 className="mr-2 size-4" />Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEdicao(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* publicado */}
      <Dialog open={!!verItem} onOpenChange={(o) => !o && setVerItem(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-7">
              <DialogTitle>Publicado</DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={!anterior}
                  onClick={() => setVerItem(anterior)}
                  aria-label="Publicação anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-[52px] text-center text-xs text-muted-foreground">
                  {indicePub >= 0 ? `${indicePub + 1} de ${postsPublicados.length}` : ""}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={!proxima}
                  onClick={() => setVerItem(proxima)}
                  aria-label="Próxima publicação"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          {verItem ? (
            <div className="space-y-3">
              {capas[verItem.capa_path] ? (
                <img src={capas[verItem.capa_path]} alt="" className="max-h-[60vh] w-full rounded-lg object-contain" />
              ) : null}
              <p className="whitespace-pre-wrap text-sm">{verItem.legenda || "sem legenda"}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{verItem.curtidas} curtidas</span>
                <span>{verItem.comentarios} comentários</span>
                {verItem.permalink ? (
                  <a className="underline" href={verItem.permalink} target="_blank" rel="noreferrer">
                    abrir no Instagram
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* fileira de stories */}
      <Dialog open={!!verStories} onOpenChange={(o) => !o && setVerStories(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Stories do dia</DialogTitle></DialogHeader>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(verStories ?? []).map((s) => (
              <img
                key={s.id}
                src={capas[s.capa_path]}
                alt=""
                className="h-[220px] w-auto shrink-0 rounded-md object-contain"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
