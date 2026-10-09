import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileDown, Maximize2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CampoAutoSave } from "@/components/biblioteca/comum";
import {
  MolduraReferencia,
  estiloMosaico,
  estiloPeca,
  useLarguraDisponivel,
} from "@/components/biblioteca/MosaicoReferencias";
import { MuralReferencias } from "@/components/biblioteca/MuralReferencias";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { baixarZip, pdfMoodboard } from "@/lib/biblioteca-pdf";
import {
  LARGURA_COLUNA,
  apagarGrupoReferencia,
  apagarReferencia,
  criarGrupoReferencia,
  enviarReferencia,
  gruposReferenciaQueryOptions,
  medirMosaico,
  medirPeca,
  prepararMoodboard,
  previasReferenciaQueryOptions,
  referenciasQueryOptions,
  reordenarReferencias,
  salvarGrupoReferencia,
  salvarReferencia,
  type GrupoReferencia,
  type Referencia,
  type TamanhoGrade,
} from "@/lib/biblioteca-referencias";

export const Route = createFileRoute("/_authenticated/biblioteca/referencias")({
  head: () => ({
    meta: [
      { title: "Referências visuais — Biblioteca — Marketing Juff" },
      { name: "description", content: "Prints e referências visuais para ensaio e moodboard." },
      { property: "og:title", content: "Referências visuais — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Prints e referências visuais para ensaio e moodboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferenciasPage,
});

const K_GRP = gruposReferenciaQueryOptions.queryKey;
const K_REF = referenciasQueryOptions.queryKey;
const CHAVE_TAMANHO = "juff.referencias.tamanho";

function lerTamanho(): TamanhoGrade {
  if (typeof window === "undefined") return "m";
  const v = window.localStorage.getItem(CHAVE_TAMANHO);
  return v === "p" || v === "m" || v === "g" ? v : "m";
}

function ReferenciasPage() {
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.arquivos");
  const podeEditar = canEdit(profile, "biblioteca.arquivos");
  const { data: grupos = [] } = useQuery({ ...gruposReferenciaQueryOptions, enabled: pode });
  const { data: refs = [] } = useQuery({ ...referenciasQueryOptions, enabled: pode });
  const caminhos = useMemo(() => refs.filter((r) => r.ativo).map((r) => r.caminho), [refs]);
  const { data: previas = {} } = useQuery({
    ...previasReferenciaQueryOptions(caminhos),
    enabled: pode && caminhos.length > 0,
  });

  const [tamanho, setTamanho] = useState<TamanhoGrade>(lerTamanho);
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState("");
  const [aceso, setAceso] = useState<string | null>(null);
  const [mural, setMural] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<{ feito: number; total: number } | null>(null);

  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor));

  function trocarTamanho(t: TamanhoGrade) {
    setTamanho(t);
    try {
      window.localStorage.setItem(CHAVE_TAMANHO, t);
    } catch {
      // Navegador bloqueando armazenamento não pode impedir a troca na tela.
    }
  }

  const gruposAtivos = useMemo(() => grupos.filter((g) => g.ativo), [grupos]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, Referencia[]>();
    for (const g of gruposAtivos) mapa.set(g.id, []);
    for (const r of refs) {
      if (!r.ativo) continue;
      const lista = mapa.get(r.grupo_id);
      if (lista) lista.push(r);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.posicao - b.posicao);
    return mapa;
  }, [gruposAtivos, refs]);

  // ---------- envio ----------

  async function enviarLista(grupoId: string, lista: File[]) {
    const imagens = lista.filter((f) => f.type.startsWith("image/"));
    if (!imagens.length) {
      if (lista.length) toast.error("Só entra imagem aqui.");
      return;
    }
    if (enviando) return;
    setEnviando({ feito: 0, total: imagens.length });
    let pos = (porGrupo.get(grupoId) ?? []).reduce((m, r) => Math.max(m, r.posicao), 0) + 1;
    for (let i = 0; i < imagens.length; i++) {
      try {
        await enviarReferencia(grupoId, imagens[i]!, pos++);
      } catch (e) {
        toast.error(`${imagens[i]!.name}: ${(e as Error).message}`);
      }
      setEnviando({ feito: i + 1, total: imagens.length });
    }
    setEnviando(null);
    void qc.invalidateQueries({ queryKey: K_REF });
  }

  // Colar com Ctrl V cai sempre no grupo aceso, e aceita várias seguidas.
  useEffect(() => {
    if (!podeEditar) return;
    function colar(e: ClipboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable)) return;
      const itens = Array.from(e.clipboardData?.items ?? []);
      const arquivos = itens
        .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f));
      if (!arquivos.length) return;
      e.preventDefault();
      if (!aceso) {
        toast.error("Clique no grupo antes de colar.");
        return;
      }
      void enviarLista(aceso, arquivos);
    }
    document.addEventListener("paste", colar);
    return () => document.removeEventListener("paste", colar);
  });

  // ---------- grupos ----------

  async function criarGrupo() {
    const nome = novo.trim();
    if (!nome) return;
    const max = grupos.reduce((m, g) => Math.max(m, g.posicao), 0);
    try {
      const id = await criarGrupoReferencia(nome, max + 1);
      setNovo("");
      setCriando(false);
      setAceso(id);
      void qc.invalidateQueries({ queryKey: K_GRP });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function renomearGrupo(g: GrupoReferencia, nome: string) {
    const limpo = nome.trim();
    if (!limpo || limpo === g.nome) return;
    const antes = qc.getQueryData<GrupoReferencia[]>(K_GRP);
    qc.setQueryData<GrupoReferencia[]>(K_GRP, (l) => l?.map((x) => (x.id === g.id ? { ...x, nome: limpo } : x)));
    salvarGrupoReferencia(g.id, { nome: limpo }).catch((e: Error) => {
      qc.setQueryData(K_GRP, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  function apagarGrupo(g: GrupoReferencia) {
    const lista = porGrupo.get(g.id) ?? [];
    const n = lista.length;
    const pergunta = n
      ? `Apagar o grupo ${g.nome} e ${n} ${n === 1 ? "imagem" : "imagens"} junto?`
      : `Apagar o grupo ${g.nome}?`;
    if (!confirm(pergunta)) return;
    const antesG = qc.getQueryData<GrupoReferencia[]>(K_GRP);
    const antesR = qc.getQueryData<Referencia[]>(K_REF);
    qc.setQueryData<GrupoReferencia[]>(K_GRP, (l) => l?.filter((x) => x.id !== g.id));
    qc.setQueryData<Referencia[]>(K_REF, (l) => l?.filter((r) => r.grupo_id !== g.id));
    apagarGrupoReferencia(g.id, lista.map((r) => r.caminho)).catch((e: Error) => {
      qc.setQueryData(K_GRP, antesG);
      qc.setQueryData(K_REF, antesR);
      toast.error(e.message);
    });
  }

  // ---------- imagens ----------

  function patch(id: string, p: Partial<Referencia>) {
    const antes = qc.getQueryData<Referencia[]>(K_REF);
    qc.setQueryData<Referencia[]>(K_REF, (l) => l?.map((r) => (r.id === id ? { ...r, ...p } : r)));
    salvarReferencia(id, p).catch((e: Error) => {
      qc.setQueryData(K_REF, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  function apagar(r: Referencia) {
    if (!confirm(`Apagar ${r.nome}?`)) return;
    const antes = qc.getQueryData<Referencia[]>(K_REF);
    qc.setQueryData<Referencia[]>(K_REF, (l) => l?.filter((x) => x.id !== r.id));
    apagarReferencia(r.id, r.caminho).catch((e: Error) => {
      qc.setQueryData(K_REF, antes);
      toast.error(e.message);
    });
  }

  function aoSoltar(e: DragEndEvent) {
    const ativo = refs.find((r) => r.id === e.active.id);
    if (!ativo || !e.over) return;
    const sobre = String(e.over.id);
    const destino = sobre.startsWith("grupo-") ? sobre.slice(6) : refs.find((r) => r.id === sobre)?.grupo_id;
    if (!destino) return;

    const origemLista = (porGrupo.get(ativo.grupo_id) ?? []).filter((r) => r.id !== ativo.id);
    const destinoLista = destino === ativo.grupo_id ? origemLista : [...(porGrupo.get(destino) ?? [])];
    const alvoIndice = sobre.startsWith("grupo-")
      ? destinoLista.length
      : Math.max(0, destinoLista.findIndex((r) => r.id === sobre));
    destinoLista.splice(alvoIndice, 0, { ...ativo, grupo_id: destino });

    const mudancas: { id: string; grupo_id: string; posicao: number }[] = [];
    destinoLista.forEach((r, i) => mudancas.push({ id: r.id, grupo_id: destino, posicao: i + 1 }));
    if (destino !== ativo.grupo_id) {
      origemLista.forEach((r, i) => mudancas.push({ id: r.id, grupo_id: ativo.grupo_id, posicao: i + 1 }));
    }

    const antes = qc.getQueryData<Referencia[]>(K_REF);
    const mapa = new Map(mudancas.map((m) => [m.id, m]));
    qc.setQueryData<Referencia[]>(K_REF, (l) =>
      l?.map((r) => {
        const m = mapa.get(r.id);
        return m ? { ...r, grupo_id: m.grupo_id, posicao: m.posicao } : r;
      }),
    );
    reordenarReferencias(mudancas).catch((err: Error) => {
      qc.setQueryData(K_REF, antes);
      toast.error(`Não foi possível reordenar: ${err.message}`);
    });
  }

  // ---------- PDF ----------

  const [gerandoPdf, setGerandoPdf] = useState<string | null>(null);

  async function gerarPdf(g: GrupoReferencia) {
    const lista = porGrupo.get(g.id) ?? [];
    if (!lista.length) {
      toast.error("Esse grupo está vazio.");
      return;
    }
    setGerandoPdf(g.id);
    try {
      const itens = await prepararMoodboard(lista);
      const blob = pdfMoodboard(g.nome, itens);
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = `Moodboard ${g.nome}.pdf`;
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerandoPdf(null);
    }
  }

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem acesso às Referências visuais.
        </p>
      </AppShell>
    );
  }

  const grupoDoMural = mural ? gruposAtivos.find((g) => g.id === mural) : null;

  return (
    <AppShell largura="ampla">
      {!podeEditar ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Você está em modo de consulta. Pode ver, abrir o mural e exportar, mas não alterar.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {podeEditar && aceso ? (
          <span className="mr-auto text-xs text-muted-foreground">
            Colando em {gruposAtivos.find((g) => g.id === aceso)?.nome ?? ""}
          </span>
        ) : null}
        {enviando ? (
          <span className="text-xs text-muted-foreground">
            Enviando {enviando.feito} de {enviando.total}
          </span>
        ) : null}
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["p", "m", "g"] as TamanhoGrade[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => trocarTamanho(t)}
              className={cn(
                "px-2.5 py-1 text-xs uppercase transition-colors",
                tamanho === t ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {podeEditar ? (
          criando ? (
            <div className="flex gap-1">
              <Input
                autoFocus
                value={novo}
                placeholder="Nome do grupo"
                className="h-8 w-56"
                onChange={(e) => setNovo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void criarGrupo();
                  if (e.key === "Escape") setCriando(false);
                }}
              />
              <Button size="sm" onClick={() => void criarGrupo()}>Criar</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setCriando(true)}>
              <Plus className="size-4" /> Criar grupo
            </Button>
          )
        ) : null}
      </div>

      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <div className="space-y-6">
          {gruposAtivos.map((g) => (
            <BlocoGrupo
              key={g.id}
              grupo={g}
              refs={porGrupo.get(g.id) ?? []}
              previas={previas}
              tamanho={tamanho}
              podeEditar={podeEditar}
              aceso={aceso === g.id}
              gerando={gerandoPdf === g.id}
              onAcender={() => setAceso(g.id)}
              onRenomear={(nome) => renomearGrupo(g, nome)}
              onApagarGrupo={() => apagarGrupo(g)}
              onMural={() => setMural(g.id)}
              onPdf={() => void gerarPdf(g)}
              onEnviar={(lista) => void enviarLista(g.id, lista)}
              onPatch={patch}
              onApagar={apagar}
            />
          ))}
          {!gruposAtivos.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhum grupo ainda. Crie um grupo e cole o primeiro print nele.
            </p>
          ) : null}
        </div>
      </DndContext>

      {grupoDoMural ? (
        <MuralReferencias
          grupo={grupoDoMural}
          refs={porGrupo.get(grupoDoMural.id) ?? []}
          previas={previas}
          onFechar={() => setMural(null)}
        />
      ) : null}
    </AppShell>
  );
}

function BlocoGrupo({
  grupo,
  refs,
  previas,
  tamanho,
  podeEditar,
  aceso,
  gerando,
  onAcender,
  onRenomear,
  onApagarGrupo,
  onMural,
  onPdf,
  onEnviar,
  onPatch,
  onApagar,
}: {
  grupo: GrupoReferencia;
  refs: Referencia[];
  previas: Record<string, string>;
  tamanho: TamanhoGrade;
  podeEditar: boolean;
  aceso: boolean;
  gerando: boolean;
  onAcender: () => void;
  onRenomear: (nome: string) => void;
  onApagarGrupo: () => void;
  onMural: () => void;
  onPdf: () => void;
  onEnviar: (lista: File[]) => void;
  onPatch: (id: string, p: Partial<Referencia>) => void;
  onApagar: (r: Referencia) => void;
}) {
  const { alvo, largura } = useLarguraDisponivel();
  const { colunas, larguraColuna } = useMemo(
    () => medirMosaico(largura, LARGURA_COLUNA[tamanho]),
    [largura, tamanho],
  );
  const { setNodeRef } = useDroppable({ id: `grupo-${grupo.id}` });
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(grupo.nome);
  const entrada = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);

  useEffect(() => setNome(grupo.nome), [grupo.nome]);

  return (
    <section
      onMouseDown={onAcender}
      onDragOver={(e) => {
        if (!podeEditar) return;
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        if (!podeEditar) return;
        e.preventDefault();
        setSobre(false);
        onAcender();
        onEnviar(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        aceso ? "border-primary ring-1 ring-primary" : "border-border",
        sobre && "border-primary bg-primary-soft",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {editandoNome && podeEditar ? (
          <Input
            autoFocus
            value={nome}
            className="h-8 w-64"
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => {
              setEditandoNome(false);
              onRenomear(nome);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditandoNome(false);
                onRenomear(nome);
              }
              if (e.key === "Escape") {
                setNome(grupo.nome);
                setEditandoNome(false);
              }
            }}
          />
        ) : (
          <h2
            onDoubleClick={() => podeEditar && setEditandoNome(true)}
            className="text-sm font-medium"
            title={podeEditar ? "Dois cliques para renomear" : undefined}
          >
            {grupo.nome}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {refs.length} {refs.length === 1 ? "referência" : "referências"}
            </span>
          </h2>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            disabled={!refs.length}
            onClick={onMural}
          >
            <Maximize2 className="size-4" /> Ver o grupo inteiro
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            disabled={!refs.length || gerando}
            onClick={onPdf}
          >
            <FileDown className="size-4" /> {gerando ? "Gerando" : "PDF"}
          </Button>
          {podeEditar ? (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={onApagarGrupo}>
              <Trash2 className="size-4" /> Apagar grupo
            </Button>
          ) : null}
        </div>
      </div>

      <div ref={setNodeRef}>
        <div ref={alvo}>
          <SortableContext items={refs.map((r) => r.id)} strategy={rectSortingStrategy}>
            <div style={estiloMosaico(colunas, false)}>
              {refs.map((r) => (
                <Cartao
                  key={r.id}
                  r={r}
                  url={previas[r.caminho] ?? ""}
                  colunas={colunas}
                  larguraColuna={larguraColuna}
                  podeEditar={podeEditar}
                  onPatch={(p) => onPatch(r.id, p)}
                  onApagar={() => onApagar(r)}
                />
              ))}
              {podeEditar ? (
                <div style={{ gridColumn: "span 1", gridRow: `span ${Math.round(larguraColuna * 0.75) + 8}` }}>
                  <button
                    type="button"
                    onClick={() => entrada.current?.click()}
                    style={{ height: Math.round(larguraColuna * 0.75) }}
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border px-2 text-center text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Upload className="size-5" />
                    colar, arrastar ou enviar
                    <input
                      ref={entrada}
                      type="file"
                      multiple
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const lista = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        onEnviar(lista);
                      }}
                    />
                  </button>
                </div>
              ) : null}
            </div>
          </SortableContext>
        </div>
      </div>

      {!refs.length && !podeEditar ? (
        <p className="text-xs text-muted-foreground">Ainda não tem referência neste grupo.</p>
      ) : null}
    </section>
  );
}

function Cartao({
  r,
  url,
  colunas,
  larguraColuna,
  podeEditar,
  onPatch,
  onApagar,
}: {
  r: Referencia;
  url: string;
  colunas: number;
  larguraColuna: number;
  podeEditar: boolean;
  onPatch: (p: Partial<Referencia>) => void;
  onApagar: () => void;
}) {
  const peca = useMemo(() => medirPeca(r, larguraColuna, colunas), [r, larguraColuna, colunas]);
  const sortable = useSortable({ id: r.id, disabled: !podeEditar });

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        ...estiloPeca(peca, colunas),
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn("group relative", sortable.isDragging && "z-40 opacity-80")}
    >
      <div
        {...(podeEditar ? sortable.attributes : {})}
        {...(podeEditar ? sortable.listeners : {})}
        title={r.nome}
        className={cn("touch-none select-none", podeEditar && "cursor-grab active:cursor-grabbing")}
      >
        <MolduraReferencia r={r} url={url} peca={peca} />
      </div>
      {podeEditar ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Editar ${r.nome}`}
              className="absolute right-1 top-1 rounded-md bg-background/85 p-1 text-foreground opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Pencil className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3">
            <CampoAutoSave
              valor={r.nome}
              placeholder="Nome"
              onSalvar={(v) => v.trim() && onPatch({ nome: v.trim() })}
            />
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={onApagar}>
              <Trash2 className="size-4" /> Apagar imagem
            </Button>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
