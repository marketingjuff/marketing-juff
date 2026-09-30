import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bloco, CampoAutoSave } from "@/components/biblioteca/comum";
import { BotaoZip } from "@/components/biblioteca/BotaoZip";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import { textoSobreCor } from "@/config/produtos";
import { cn } from "@/lib/utils";
import {
  GRUPOS_TEXTO,
  ROTULO_GRUPO,
  apagarCorPaleta,
  apagarTexto,
  criarCorPaleta,
  criarTexto,
  paletaQueryOptions,
  salvarCorPaleta,
  salvarTexto,
  textosQueryOptions,
  type CorPaleta,
  type GrupoTexto,
  type TextoMarca,
} from "@/lib/biblioteca-marca";

export const Route = createFileRoute("/_authenticated/biblioteca/marca")({
  head: () => ({
    meta: [
      { title: "Marca — Biblioteca — Marketing Juff" },
      { name: "description", content: "Paleta do manual de marca e textos prontos da Juff." },
      { property: "og:title", content: "Marca — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Paleta do manual de marca e textos prontos da Juff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MarcaPage,
});

const K_PAL = paletaQueryOptions.queryKey;
const K_TXT = textosQueryOptions.queryKey;
const HEX = /^#[0-9a-f]{6}$/;

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

function MarcaPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.marca");
  const admin = profile?.role === "admin";
  const { data: paleta = [] } = useQuery({ ...paletaQueryOptions, enabled: pode });
  const { data: textos = [] } = useQuery({ ...textosQueryOptions, enabled: pode });

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Você não tem acesso à Biblioteca de marca.</p>
      </AppShell>
    );
  }

  return (
    <AppShell largura="ampla">
      <div className="mb-4 flex justify-end"><BotaoZip origem="marca" /></div>
      <div className="space-y-6">
        <SecaoPaleta paleta={paleta} admin={admin} />
        <SecaoTextos textos={textos} admin={admin} />
      </div>
    </AppShell>
  );
}

// ---------------- Paleta ----------------

function SecaoPaleta({ paleta, admin }: { paleta: CorPaleta[]; admin: boolean }) {
  const qc = useQueryClient();
  const ativas = paleta.filter((c) => c.ativo);
  const oficiais = ativas.filter((c) => !c.rascunho);
  const testes = ativas.filter((c) => c.rascunho);

  function patch(id: string, p: Partial<CorPaleta>) {
    const antes = qc.getQueryData<CorPaleta[]>(K_PAL);
    qc.setQueryData<CorPaleta[]>(K_PAL, (l) => l?.map((c) => (c.id === id ? { ...c, ...p } : c)));
    salvarCorPaleta(id, p).catch((e: Error) => {
      qc.setQueryData(K_PAL, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  async function acrescentar() {
    const max = paleta.reduce((m, c) => Math.max(m, c.posicao), 0);
    try {
      await criarCorPaleta(`Nova cor ${max + 1}`, "#888888", max + 1);
      void qc.invalidateQueries({ queryKey: K_PAL });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function apagar(id: string) {
    if (!confirm("Apagar esta cor da paleta?")) return;
    const antes = qc.getQueryData<CorPaleta[]>(K_PAL);
    qc.setQueryData<CorPaleta[]>(K_PAL, (l) => l?.filter((c) => c.id !== id));
    apagarCorPaleta(id).catch((e: Error) => {
      qc.setQueryData(K_PAL, antes);
      toast.error(e.message);
    });
  }

  const grade = (lista: CorPaleta[], teste: boolean) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {lista.map((c) => (
        <Quadrado key={c.id} cor={c} teste={teste} admin={admin} onPatch={(p) => patch(c.id, p)} onApagar={() => void apagar(c.id)} />
      ))}
    </div>
  );

  return (
    <Bloco titulo="Paleta do manual de marca" acoes={admin ? (
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => void acrescentar()}><Plus className="size-4" /> Acrescentar cor</Button>
    ) : undefined}>
      <p className="mb-3 text-xs text-muted-foreground">Cores digitais do manual. Não são cores de tecido. A cartela de camiseta fica em Produtos.</p>
      {grade(oficiais, false)}
      {testes.length ? (
        <>
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cores em teste</h3>
          {grade(testes, true)}
        </>
      ) : null}
    </Bloco>
  );
}

function Quadrado({ cor, teste, admin, onPatch, onApagar }: { cor: CorPaleta; teste: boolean; admin: boolean; onPatch: (p: Partial<CorPaleta>) => void; onApagar: () => void }) {
  const fg = textoSobreCor(HEX.test(cor.hex) ? cor.hex : "#888888");
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void copiar(cor.hex, `${cor.nome}: ${cor.hex} copiado`)}
        className={cn("flex aspect-square w-full flex-col justify-end rounded-xl p-3 text-left transition-transform hover:scale-[1.02]", teste && "outline-dashed outline-2 outline-offset-2 outline-muted-foreground")}
        style={{
          backgroundColor: cor.hex,
          color: fg,
          backgroundImage: teste ? `repeating-linear-gradient(135deg, transparent 0 10px, ${fg}22 10px 12px)` : undefined,
        }}
      >
        <span className="text-sm font-bold leading-tight">{cor.nome}</span>
        <span className="text-xs">{cor.hex.toUpperCase()}</span>
      </button>
      {admin ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label={`Editar ${cor.nome}`} className="absolute right-2 top-2 rounded-md bg-background/80 p-1 text-foreground hover:bg-background">
              <Pencil className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3">
            <CampoAutoSave valor={cor.nome} onSalvar={(v) => v.trim() && onPatch({ nome: v.trim() })} />
            <ColorPicker value={cor.hex} onChange={(hex) => HEX.test(hex) && onPatch({ hex })} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={cor.rascunho} onCheckedChange={(v) => onPatch({ rascunho: v === true })} /> Em teste
            </label>
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={onApagar}><Trash2 className="size-4" /> Apagar cor</Button>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

// ---------------- Textos ----------------

function SecaoTextos({ textos, admin }: { textos: TextoMarca[]; admin: boolean }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();

  function patch(id: string, p: Partial<TextoMarca>) {
    const antes = qc.getQueryData<TextoMarca[]>(K_TXT);
    qc.setQueryData<TextoMarca[]>(K_TXT, (l) => l?.map((t) => (t.id === id ? { ...t, ...p } : t)));
    salvarTexto(id, p).catch((e: Error) => {
      qc.setQueryData(K_TXT, antes);
      toast.error(`Não foi possível gravar: ${e.message}`);
    });
  }

  async function acrescentar(grupo: GrupoTexto) {
    const max = textos.filter((t) => t.grupo === grupo).reduce((m, t) => Math.max(m, t.posicao), 0);
    try {
      await criarTexto(grupo, `Novo texto ${max + 1}`, max + 1);
      void qc.invalidateQueries({ queryKey: K_TXT });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function apagar(id: string) {
    if (!confirm("Apagar este texto?")) return;
    const antes = qc.getQueryData<TextoMarca[]>(K_TXT);
    qc.setQueryData<TextoMarca[]>(K_TXT, (l) => l?.filter((t) => t.id !== id));
    apagarTexto(id).catch((e: Error) => {
      qc.setQueryData(K_TXT, antes);
      toast.error(e.message);
    });
  }

  const blocos = GRUPOS_TEXTO.map((g) => ({
    grupo: g,
    lista: textos.filter((t) => t.grupo === g && t.ativo && (!termo || `${t.titulo ?? ""} ${t.texto}`.toLowerCase().includes(termo))),
  })).filter((b) => !termo || b.lista.length);

  return (
    <Bloco titulo="Frases e textos prontos">
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="pl-8" />
      </div>
      <div className="space-y-5">
        {blocos.map(({ grupo, lista }) => (
          <div key={grupo}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{ROTULO_GRUPO[grupo]}</h3>
              {admin ? <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => void acrescentar(grupo)}><Plus className="size-4" /> Acrescentar</Button> : null}
            </div>
            <div className={cn(grupo === "texto" ? "space-y-2" : "grid gap-2 sm:grid-cols-2 lg:grid-cols-3")}>
              {lista.map((t) =>
                grupo === "texto" ? (
                  <TextoLongo key={t.id} t={t} admin={admin} onPatch={(p) => patch(t.id, p)} onApagar={() => apagar(t.id)} />
                ) : (
                  <FraseCurta key={t.id} t={t} admin={admin} onPatch={(p) => patch(t.id, p)} onApagar={() => apagar(t.id)} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Bloco>
  );
}

type PropsTexto = { t: TextoMarca; admin: boolean; onPatch: (p: Partial<TextoMarca>) => void; onApagar: () => void };

function AcoesAdmin({ editando, setEditando, onApagar }: { editando: boolean; setEditando: (v: boolean) => void; onApagar: () => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" aria-label="Editar" className="rounded p-1 text-muted-foreground hover:bg-secondary" onClick={() => setEditando(!editando)}><Pencil className="size-3.5" /></button>
      {editando ? <button type="button" aria-label="Apagar" className="rounded p-1 text-destructive hover:bg-secondary" onClick={onApagar}><Trash2 className="size-3.5" /></button> : null}
    </div>
  );
}

function FraseCurta({ t, admin, onPatch, onApagar }: PropsTexto) {
  const [editando, setEditando] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      {editando ? (
        <CampoAutoSave valor={t.texto} className="h-8" onSalvar={(v) => v.trim() && onPatch({ texto: v.trim() })} />
      ) : (
        <button type="button" className="flex-1 text-left text-sm" onClick={() => void copiar(t.texto, "Texto copiado")}>{t.texto}</button>
      )}
      {admin ? <AcoesAdmin editando={editando} setEditando={setEditando} onApagar={onApagar} /> : null}
    </div>
  );
}

function TextoLongo({ t, admin, onPatch, onApagar }: PropsTexto) {
  const [editando, setEditando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(t.texto);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {editando ? (
            <div className="space-y-2">
              <CampoAutoSave valor={t.titulo ?? ""} placeholder="Título" onSalvar={(v) => onPatch({ titulo: v.trim() || null })} />
              <textarea
                className="min-h-32 w-full rounded-md border border-input bg-background p-2 text-sm"
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onBlur={() => rascunho.trim() && rascunho !== t.texto && onPatch({ texto: rascunho })}
              />
            </div>
          ) : (
            <>
              <button type="button" className="text-left text-sm font-bold" onClick={() => setAberto(!aberto)}>{t.titulo ?? "Sem título"}</button>
              <p className={cn("mt-1 whitespace-pre-line text-sm text-muted-foreground", !aberto && "line-clamp-3")}>{t.texto}</p>
            </>
          )}
        </div>
        <button type="button" aria-label="Copiar" className="rounded p-1 text-muted-foreground hover:bg-secondary" onClick={() => void copiar(t.texto, "Texto copiado")}><Copy className="size-4" /></button>
        {admin ? <AcoesAdmin editando={editando} setEditando={setEditando} onApagar={onApagar} /> : null}
      </div>
    </div>
  );
}
