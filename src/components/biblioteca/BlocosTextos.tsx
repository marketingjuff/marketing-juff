import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bloco, CampoAutoSave, copiar } from "@/components/biblioteca/comum";
import { cn } from "@/lib/utils";
import {
  GRUPOS_TEXTO,
  ROTULO_GRUPO,
  apagarTexto,
  criarTexto,
  salvarTexto,
  textosQueryOptions,
  type GrupoTexto,
  type TextoMarca,
} from "@/lib/biblioteca-marca";

const K_TXT = textosQueryOptions.queryKey;

// ---------------- Textos ----------------

export function SecaoTextos({ textos, admin }: { textos: TextoMarca[]; admin: boolean }) {
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
