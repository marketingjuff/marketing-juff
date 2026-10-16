import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DIAS_SEMANA, aplicarImportacao, gravarPedido, lerCronograma, pedidoQueryOptions,
  promptCronograma, promptTextos, reciboLeitura,
  type ContextoPrompt, type EmailCrono, type PedidoEmails, type TipoEmail,
} from "@/lib/estrategia-emails";

export function CaixaCopiar({ texto }: { texto: string }) {
  return (
    <div className="space-y-2">
      <Textarea readOnly value={texto} className="h-[55vh] font-mono text-xs" />
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1"
          onClick={async () => {
            try { await navigator.clipboard.writeText(texto); toast.success("Copiado"); }
            catch { toast.error("Não deu para copiar, selecione e copie na mão"); }
          }}
        >
          <Copy className="size-4" /> Copiar
        </Button>
      </div>
    </div>
  );
}

// ---------------- prompt do cronograma ----------------

export function DialogPromptCronograma({
  open, onOpenChange, ano, mes, contexto, editavel,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; ano: number; mes: number;
  contexto: ContextoPrompt; editavel: boolean;
}) {
  const qc = useQueryClient();
  const { data: guardado } = useQuery({ ...pedidoQueryOptions(ano, mes), enabled: open });
  const [p, setP] = useState<PedidoEmails>({ total: 0, itens: [], extras: 0, observacoes: "", dias_evitar: "" });
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setTexto(null); if (guardado) setP(guardado); }
  }, [open, guardado]);

  const ativos = contexto.tipos.filter((t) => t.ativo);
  const soma = p.itens.reduce((s, i) => s + (Number(i.quantidade) || 0), 0) + (Number(p.extras) || 0);
  const dias = new Set(p.dias_evitar.split(",").filter(Boolean));

  function gerar() {
    setTexto(promptCronograma(contexto, p));
    if (editavel) {
      qc.setQueryData(["estrategia", "email-pedido", ano, mes], p);
      gravarPedido(ano, mes, p).catch(() => toast.error("O prompt saiu, mas o pedido não foi guardado"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Prompt do cronograma</DialogTitle></DialogHeader>
        {texto !== null ? (
          <div className="space-y-2">
            <CaixaCopiar texto={texto} />
            <Button variant="ghost" size="sm" onClick={() => setTexto(null)}>Voltar ao formulário</Button>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <label className="flex items-center gap-2">
              <span className="w-48">Total de e-mails do mês</span>
              <Input type="number" min={0} className="h-8 w-24" value={p.total}
                onChange={(e) => setP({ ...p, total: Number(e.target.value) || 0 })} />
            </label>

            <div className="space-y-2">
              <p className="font-medium">Por tipo</p>
              {p.itens.map((it, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Select value={it.tipo_id} onValueChange={(v) => {
                    const itens = [...p.itens]; itens[i] = { ...it, tipo_id: v }; setP({ ...p, itens });
                  }}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {ativos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={0} className="h-8 w-20" value={it.quantidade}
                    onChange={(e) => {
                      const itens = [...p.itens]; itens[i] = { ...it, quantidade: Number(e.target.value) || 0 }; setP({ ...p, itens });
                    }} />
                  <Input className="h-8 min-w-[10rem] flex-1" placeholder="Detalhe (ex.: quais estampas)" value={it.detalhe}
                    onChange={(e) => {
                      const itens = [...p.itens]; itens[i] = { ...it, detalhe: e.target.value }; setP({ ...p, itens });
                    }} />
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Remover linha"
                    onClick={() => setP({ ...p, itens: p.itens.filter((_, j) => j !== i) })}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-8 gap-1"
                onClick={() => setP({ ...p, itens: [...p.itens, { tipo_id: "", quantidade: 1, detalhe: "" }] })}>
                <Plus className="size-4" /> Adicionar tipo
              </Button>
            </div>

            <label className="flex items-center gap-2">
              <span className="w-48">A critério da IA</span>
              <Input type="number" min={0} className="h-8 w-24" value={p.extras}
                onChange={(e) => setP({ ...p, extras: Number(e.target.value) || 0 })} />
            </label>

            <div>
              <p className="mb-1 font-medium">Dias da semana a evitar</p>
              <div className="flex flex-wrap gap-3">
                {DIAS_SEMANA.map((d, i) => (
                  <label key={d} className="flex items-center gap-1.5">
                    <Checkbox checked={dias.has(String(i))} onCheckedChange={(v) => {
                      const s = new Set(dias); if (v) s.add(String(i)); else s.delete(String(i));
                      setP({ ...p, dias_evitar: [...s].sort().join(",") });
                    }} />
                    {d}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 font-medium">Observações</p>
              <Textarea rows={3} value={p.observacoes} onChange={(e) => setP({ ...p, observacoes: e.target.value })} />
            </div>

            {soma !== p.total ? (
              <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                A soma por tipo mais os da IA dá {soma}, e o total está {p.total}.
              </p>
            ) : null}

            <div className="flex justify-end"><Button onClick={gerar}>Gerar</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------- importar ----------------

export function DialogImportarCronograma({
  open, onOpenChange, ano, mes, tipos, temLinhas,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; ano: number; mes: number;
  tipos: TipoEmail[]; temLinhas: boolean;
}) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<"substituir" | "acrescentar" | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { if (open) { setTexto(""); setModo(null); } }, [open]);

  const leitura = useMemo(() => lerCronograma(texto, tipos, ano, mes), [texto, tipos, ano, mes]);
  const pode = leitura.linhas.length > 0 && (!temLinhas || modo !== null) && !enviando;

  async function aplicar() {
    setEnviando(true);
    try {
      const n = await aplicarImportacao(ano, mes, leitura.linhas, temLinhas ? modo === "substituir" : false);
      toast.success(`${n} e-mails gravados`);
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["estrategia", "emails", ano, mes] });
    } catch {
      toast.error("Não deu para importar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Importar cronograma</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <Textarea rows={12} value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole aqui o que a IA devolveu. Formato: EMAIL | dd/mm/aaaa | Tipo | Tema | Conteúdo | Chamada secundária"
            className="font-mono text-xs" />
          <p className="text-muted-foreground">{reciboLeitura(leitura, mes)}</p>
          {temLinhas ? (
            <div className="flex flex-wrap gap-4">
              {(["substituir", "acrescentar"] as const).map((m) => (
                <label key={m} className="flex items-center gap-1.5">
                  <input type="radio" name="modo-import" checked={modo === m} onChange={() => setModo(m)} />
                  {m === "substituir" ? "Substituir o mês inteiro" : "Acrescentar ao que já existe"}
                </label>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end"><Button disabled={!pode} onClick={aplicar}>Aplicar</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- prompt dos textos ----------------

export function DialogPromptTextos({
  open, onOpenChange, contexto, emails,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; contexto: ContextoPrompt; emails: EmailCrono[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Prompt dos textos</DialogTitle></DialogHeader>
        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">Preencha o cronograma do mês antes de gerar o prompt dos textos.</p>
        ) : (
          <CaixaCopiar texto={promptTextos(contexto, emails)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
