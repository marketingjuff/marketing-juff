import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bloco, CampoAutoSave } from "@/components/biblioteca/comum";
import { BotaoZip } from "@/components/biblioteca/BotaoZip";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  COM_PREVIA,
  FORMATOS,
  apagarArquivo,
  apagarGrupo,
  arquivosQueryOptions,
  baixarNoNavegador,
  criarGrupo,
  enviarArquivo,
  extensaoDe,
  gruposArquivoQueryOptions,
  previasQueryOptions,
  salvarArquivo,
  tamanhoLegivel,
  type ArquivoMarca,
  type GrupoArquivo,
} from "@/lib/biblioteca-arquivos";

export const Route = createFileRoute("/_authenticated/biblioteca/arquivos")({
  head: () => ({
    meta: [
      { title: "Arquivos — Biblioteca — Marketing Juff" },
      { name: "description", content: "Logos, vetores e manual da marca Juff para baixar." },
      { property: "og:title", content: "Arquivos — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Logos, vetores e manual da marca Juff para baixar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArquivosPage,
});

const K_ARQ = arquivosQueryOptions.queryKey;
const K_GRP = gruposArquivoQueryOptions.queryKey;
const LIMITE = 25 * 1024 * 1024;
const XADREZ: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  backgroundImage:
    "linear-gradient(45deg,#e4e4e7 25%,transparent 25%),linear-gradient(-45deg,#e4e4e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e4e7 75%),linear-gradient(-45deg,transparent 75%,#e4e4e7 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

function ArquivosPage() {
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.arquivos");
  const admin = profile?.role === "admin";
  const { data: grupos = [] } = useQuery({ ...gruposArquivoQueryOptions, enabled: pode });
  const { data: arquivos = [] } = useQuery({ ...arquivosQueryOptions, enabled: pode });
  const caminhos = arquivos.filter((a) => COM_PREVIA.includes(a.formato)).map((a) => a.caminho);
  const { data: previas = {} } = useQuery({ ...previasQueryOptions(caminhos), enabled: pode && caminhos.length > 0 });
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState("");

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Você não tem acesso aos Arquivos da marca.</p>
      </AppShell>
    );
  }

  async function criar() {
    const nome = novo.trim();
    if (!nome) return;
    const max = grupos.reduce((m, g) => Math.max(m, g.posicao), 0);
    try {
      await criarGrupo(nome, max + 1);
      setNovo("");
      setCriando(false);
      void qc.invalidateQueries({ queryKey: K_GRP });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppShell largura="ampla">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {admin ? (
          criando ? (
            <div className="flex gap-1">
              <Input autoFocus value={novo} placeholder="Nome do grupo" className="h-8 w-56" onChange={(e) => setNovo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void criar(); if (e.key === "Escape") setCriando(false); }} />
              <Button size="sm" onClick={() => void criar()}>Criar</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setCriando(true)}><Plus className="size-4" /> Criar grupo</Button>
          )
        ) : null}
        <BotaoZip origem="arquivos" />
      </div>
      <div className="space-y-6">
        {grupos.filter((g) => g.ativo).map((g) => (
          <BlocoGrupo key={g.id} grupo={g} arquivos={arquivos.filter((a) => a.grupo_id === g.id && a.ativo)} previas={previas} admin={admin} />
        ))}
        {!grupos.length ? <p className="text-sm text-muted-foreground">Nenhum grupo ainda.</p> : null}
      </div>
    </AppShell>
  );
}

function BlocoGrupo({ grupo, arquivos, previas, admin }: { grupo: GrupoArquivo; arquivos: ArquivoMarca[]; previas: Record<string, string>; admin: boolean }) {
  const qc = useQueryClient();

  function patch(id: string, p: Partial<ArquivoMarca>) {
    const antes = qc.getQueryData<ArquivoMarca[]>(K_ARQ);
    qc.setQueryData<ArquivoMarca[]>(K_ARQ, (l) => l?.map((a) => (a.id === id ? { ...a, ...p } : a)));
    salvarArquivo(id, p).catch((e: Error) => {
      qc.setQueryData(K_ARQ, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  function apagar(a: ArquivoMarca) {
    if (!confirm(`Apagar ${a.nome}?`)) return;
    const antes = qc.getQueryData<ArquivoMarca[]>(K_ARQ);
    qc.setQueryData<ArquivoMarca[]>(K_ARQ, (l) => l?.filter((x) => x.id !== a.id));
    apagarArquivo(a.id, a.caminho).catch((e: Error) => {
      qc.setQueryData(K_ARQ, antes);
      toast.error(e.message);
    });
  }

  function apagarBloco() {
    const n = arquivos.length;
    if (!confirm(n ? `Apagar o grupo ${grupo.nome} e ${n} ${n === 1 ? "arquivo" : "arquivos"} junto?` : `Apagar o grupo ${grupo.nome}?`)) return;
    const antesG = qc.getQueryData<GrupoArquivo[]>(K_GRP);
    const antesA = qc.getQueryData<ArquivoMarca[]>(K_ARQ);
    qc.setQueryData<GrupoArquivo[]>(K_GRP, (l) => l?.filter((g) => g.id !== grupo.id));
    qc.setQueryData<ArquivoMarca[]>(K_ARQ, (l) => l?.filter((a) => a.grupo_id !== grupo.id));
    apagarGrupo(grupo.id, arquivos.map((a) => a.caminho)).catch((e: Error) => {
      qc.setQueryData(K_GRP, antesG);
      qc.setQueryData(K_ARQ, antesA);
      toast.error(e.message);
    });
  }

  return (
    <Bloco titulo={grupo.nome} acoes={admin ? (
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={apagarBloco}><Trash2 className="size-4" /> Apagar grupo</Button>
    ) : undefined}>
      {!arquivos.length && !admin ? <p className="text-xs text-muted-foreground">Ainda não tem arquivo neste grupo.</p> : null}
      <div className="grid justify-start gap-3 grid-cols-[repeat(auto-fill,minmax(150px,190px))]">
        {arquivos.map((a) => (
          <Cartao key={a.id} a={a} url={previas[a.caminho]} admin={admin} onPatch={(p) => patch(a.id, p)} onApagar={() => apagar(a)} />
        ))}
        {admin ? <AreaEnvio grupoId={grupo.id} proxima={arquivos.reduce((m, a) => Math.max(m, a.posicao), 0) + 1} /> : null}
      </div>
      {!arquivos.length && admin ? <p className="mt-2 text-xs text-muted-foreground">Ainda não tem arquivo neste grupo.</p> : null}
    </Bloco>
  );
}

function Cartao({ a, url, admin, onPatch, onApagar }: { a: ArquivoMarca; url?: string; admin: boolean; onPatch: (p: Partial<ArquivoMarca>) => void; onApagar: () => void }) {
  const previa = COM_PREVIA.includes(a.formato);
  return (
    <div className="group relative">
      <button
        type="button"
        title={`Baixar ${a.nome}`}
        onClick={() => baixarNoNavegador(a).catch(() => toast.error("Não foi possível baixar."))}
        className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-background text-left transition-transform hover:-translate-y-px"
      >
        <div className="flex aspect-square w-full items-center justify-center p-3" style={XADREZ}>
          {previa ? (
            url ? <img src={url} alt={a.nome} draggable={false} className="max-h-full max-w-full object-contain" /> : null
          ) : (
            <span className="text-3xl font-bold uppercase text-muted-foreground/60">{a.formato || "?"}</span>
          )}
        </div>
        <div className="px-2 py-1.5">
          <div className="truncate text-sm font-medium">{a.nome}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {[a.formato.toUpperCase(), a.variacao, tamanhoLegivel(a.tamanho_bytes)].filter(Boolean).join(" · ")}
          </div>
        </div>
      </button>
      {admin ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label={`Editar ${a.nome}`}
              className="absolute right-1 top-1 rounded-md bg-background/85 p-1 text-foreground opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100">
              <Pencil className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3">
            <CampoAutoSave valor={a.nome} placeholder="Nome" onSalvar={(v) => v.trim() && onPatch({ nome: v.trim() })} />
            <CampoAutoSave valor={a.variacao} placeholder="Variação (ex.: preta, branca)" onSalvar={(v) => onPatch({ variacao: v.trim() })} />
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={onApagar}><Trash2 className="size-4" /> Apagar arquivo</Button>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

function AreaEnvio({ grupoId, proxima }: { grupoId: string; proxima: number }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);
  const [sobre, setSobre] = useState(false);

  async function enviar(lista: File[]) {
    if (!lista.length || progresso) return;
    setProgresso({ feito: 0, total: lista.length });
    let pos = proxima;
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i];
      const ext = extensaoDe(f.name);
      if (!(FORMATOS as readonly string[]).includes(ext)) {
        toast.error(`${f.name}: formato ${ext ? ext.toUpperCase() : "sem extensão"} não entra.`);
      } else if (f.size > LIMITE) {
        toast.error(`${f.name}: passa de 25 MB.`);
      } else {
        try {
          await enviarArquivo(grupoId, f, pos++);
        } catch (e) {
          toast.error(`${f.name}: ${(e as Error).message}`);
        }
      }
      setProgresso({ feito: i + 1, total: lista.length });
    }
    setProgresso(null);
    void qc.invalidateQueries({ queryKey: K_ARQ });
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => { e.preventDefault(); setSobre(false); void enviar(Array.from(e.dataTransfer.files)); }}
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary",
        sobre && "border-primary bg-primary-soft text-primary",
      )}
    >
      <Upload className="size-5" />
      {progresso ? `${progresso.feito} de ${progresso.total}` : "Enviar arquivo"}
      <input ref={input} type="file" multiple hidden accept={FORMATOS.map((f) => `.${f}`).join(",")}
        onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ""; void enviar(l); }} />
    </button>
  );
}
