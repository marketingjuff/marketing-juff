import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, FileDown, FileUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FRENTE_UNICA, ataQueryOptions, camposQueryOptions } from "@/lib/estrategia";
import {
  atualizarEmail, criarEmail, emailsQueryOptions, excluirEmail, gravarDocUrl, ordenar,
  regrasEmailQueryOptions, tiposEmailQueryOptions,
  type CronogramaMes, type EmailCrono,
} from "@/lib/estrategia-emails";
import {
  DialogImportarCronograma, DialogPromptCronograma, DialogPromptTextos,
} from "@/components/estrategia/DialogsCronograma";

const SEM_TIPO = "__sem__";

function CelulaTexto({ valor, editavel, onSalvar }: { valor: string; editavel: boolean; onSalvar: (v: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { if (!editando) setTexto(valor); }, [valor, editando]);
  useEffect(() => {
    if (editando && ref.current) {
      ref.current.focus();
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [editando]);

  if (editando) {
    return (
      <Textarea
        ref={ref}
        value={texto}
        rows={1}
        className="min-h-8 resize-none text-sm"
        onChange={(e) => {
          setTexto(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onBlur={() => { setEditando(false); if (texto !== valor) onSalvar(texto); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setTexto(valor); setEditando(false); } }}
      />
    );
  }
  return (
    <button
      type="button"
      disabled={!editavel}
      onClick={() => editavel && setEditando(true)}
      className="w-full rounded-md px-1 py-1 text-left text-sm hover:bg-muted/60 disabled:cursor-default disabled:hover:bg-transparent"
    >
      {valor.trim() ? <span className="whitespace-pre-wrap">{valor}</span> : <span className="text-muted-foreground">—</span>}
    </button>
  );
}

export function CronogramaEmails({ ano, mes, editavel }: { ano: number; mes: number; editavel: boolean }) {
  const qc = useQueryClient();
  const chave = ["estrategia", "emails", ano, mes] as const;
  const { data: crono = { docUrl: "", emails: [] } } = useQuery(emailsQueryOptions(ano, mes));
  const { data: tipos = [] } = useQuery(tiposEmailQueryOptions());
  const { data: regras = [] } = useQuery(regrasEmailQueryOptions());
  const { data: campos = [] } = useQuery(camposQueryOptions(FRENTE_UNICA));
  const { data: ata } = useQuery(ataQueryOptions(FRENTE_UNICA, ano, mes));
  const [dialogo, setDialogo] = useState<"prompt" | "importar" | "textos" | null>(null);
  const [doc, setDoc] = useState(crono.docUrl);
  useEffect(() => setDoc(crono.docUrl), [crono.docUrl]);

  const emails = crono.emails;
  const contexto = {
    ano, mes,
    campos: campos.filter((c) => c.ativo).map((c) => ({ label: c.label, valor: ata?.valores[c.id] ?? "" })),
    anotacoes: ata?.anotacoes ?? "",
    decisoes: (ata?.decisoes ?? []).map((d) => d.texto),
    tipos, regras,
  };

  function otimista(muda: (c: CronogramaMes) => CronogramaMes, gravar: () => Promise<unknown>) {
    const antes = qc.getQueryData<CronogramaMes>(chave);
    qc.setQueryData(chave, muda(antes ?? { docUrl: "", emails: [] }));
    gravar()
      .then(() => void qc.invalidateQueries({ queryKey: chave }))
      .catch(() => {
        qc.setQueryData(chave, antes);
        toast.error("Não deu para salvar, o valor voltou");
      });
  }

  function patch(id: string, p: Partial<EmailCrono>) {
    otimista(
      (c) => ({ ...c, emails: c.emails.map((e) => (e.id === id ? { ...e, ...p } : e)).sort(ordenar) }),
      () => atualizarEmail(id, p),
    );
  }

  const primeiro = `${ano}-${String(mes).padStart(2, "0")}-01`;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-base font-semibold">
          Cronograma de e-mails <span className="text-sm font-normal text-muted-foreground">({emails.length})</span>
        </p>
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setDialogo("prompt")}>
          <Sparkles className="size-4" /> Gerar prompt do cronograma
        </Button>
        {editavel ? (
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setDialogo("importar")}>
            <FileUp className="size-4" /> Importar cronograma
          </Button>
        ) : null}
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setDialogo("textos")}>
          <FileDown className="size-4" /> Gerar prompt dos textos
        </Button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Input
          value={doc}
          disabled={!editavel}
          placeholder="Endereço do documento com os textos"
          className="h-8 text-sm"
          onChange={(e) => setDoc(e.target.value)}
          onBlur={() => {
            const v = doc.trim();
            if (v === crono.docUrl) return;
            otimista((c) => ({ ...c, docUrl: v }), () => gravarDocUrl(ano, mes, v));
          }}
        />
        <Button variant="outline" size="sm" className="h-8 gap-1" disabled={!crono.docUrl}
          onClick={() => window.open(crono.docUrl, "_blank", "noopener,noreferrer")}>
          <ExternalLink className="size-4" /> Abrir
        </Button>
      </div>

      {!editavel ? (
        <p className="mb-3 rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          Você está vendo em modo de leitura. Os prompts continuam funcionando.
        </p>
      ) : null}

      {emails.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Nenhum e-mail no cronograma deste mês.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-36 py-2 pr-2 font-medium">Data</th>
                <th className="w-40 py-2 pr-2 font-medium">Tipo</th>
                <th className="w-48 py-2 pr-2 font-medium">Tema</th>
                <th className="py-2 pr-2 font-medium">Conteúdo</th>
                <th className="w-64 py-2 pr-2 font-medium">Chamada secundária</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              {emails.map((e) => {
                const tipo = tipos.find((t) => t.id === e.tipo_id);
                return (
                  <tr key={e.id}>
                    <td className="py-1 pr-2">
                      <Input type="date" value={e.data} disabled={!editavel} className="h-8 text-xs"
                        onChange={(ev) => ev.target.value && patch(e.id, { data: ev.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <Select value={e.tipo_id ?? SEM_TIPO} disabled={!editavel}
                        onValueChange={(v) => patch(e.id, { tipo_id: v === SEM_TIPO ? null : v })}>
                        <SelectTrigger className={`h-8 text-xs ${!e.tipo_id ? "border-primary/60 bg-primary/5" : ""}`}>
                          <SelectValue placeholder="Escolha o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_TIPO}>Sem tipo</SelectItem>
                          {tipos.filter((t) => t.ativo || t.id === tipo?.id).map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-1 pr-2"><CelulaTexto valor={e.tema} editavel={editavel} onSalvar={(v) => patch(e.id, { tema: v })} /></td>
                    <td className="py-1 pr-2"><CelulaTexto valor={e.conteudo} editavel={editavel} onSalvar={(v) => patch(e.id, { conteudo: v })} /></td>
                    <td className="py-1 pr-2"><CelulaTexto valor={e.chamada} editavel={editavel} onSalvar={(v) => patch(e.id, { chamada: v })} /></td>
                    <td className="py-1">
                      {editavel ? (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Apagar e-mail"
                          onClick={() => otimista((c) => ({ ...c, emails: c.emails.filter((x) => x.id !== e.id) }), () => excluirEmail(e.id))}>
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editavel ? (
        <Button variant="ghost" size="sm" className="mt-2 h-8 gap-1 text-muted-foreground"
          onClick={() => {
            const posicao = Math.max(0, ...emails.map((x) => x.posicao)) + 1;
            const nova: EmailCrono = { id: `tmp-${Date.now()}`, data: primeiro, tipo_id: null, tema: "", conteudo: "", chamada: "", posicao };
            otimista((c) => ({ ...c, emails: [...c.emails, nova].sort(ordenar) }), () => criarEmail(ano, mes, { data: primeiro, posicao }));
          }}>
          <Plus className="size-4" /> Adicionar linha
        </Button>
      ) : null}

      <DialogPromptCronograma open={dialogo === "prompt"} onOpenChange={(v) => !v && setDialogo(null)}
        ano={ano} mes={mes} contexto={contexto} editavel={editavel} />
      <DialogImportarCronograma open={dialogo === "importar"} onOpenChange={(v) => !v && setDialogo(null)}
        ano={ano} mes={mes} tipos={tipos} temLinhas={emails.length > 0} />
      <DialogPromptTextos open={dialogo === "textos"} onOpenChange={(v) => !v && setDialogo(null)}
        contexto={contexto} emails={emails} />
    </div>
  );
}
