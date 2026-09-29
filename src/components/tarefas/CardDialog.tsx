import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ChevronDown, Download, Plus, Trash2, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ESFORCOS,
  PRIORIDADES,
  addComentario,
  addItemChecklist,
  anexosQueryOptions,
  arquivarCard,
  checklistQueryOptions,
  comentariosQueryOptions,
  deleteAnexo,
  deleteCard,
  deleteComentario,
  deleteItemChecklist,
  etiquetasQueryOptions,
  formatarData,
  formatarTamanho,
  historicoQueryOptions,
  pessoasQueryOptions,
  quadroQueryOptions,
  quadrosQueryOptions,
  registrarHistorico,
  setEtiquetasDoCard,
  toggleItemChecklist,
  updateCard,
  uploadAnexo,
  urlAnexo,
  type Card,
  type CardUpdate,
  type QuadroCompleto,
} from "@/lib/tarefas";

const NENHUM = "__nenhum__";

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CardDialog({
  card,
  open,
  onOpenChange,
  editable,
  isAdmin,
  meuId,
}: {
  card: Card | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editable: boolean;
  isAdmin: boolean;
  meuId: string;
}) {
  const qc = useQueryClient();
  const cardId = card?.id ?? "";
  const ativo = open && !!card;
  const { data: pessoas = [] } = useQuery({ ...pessoasQueryOptions, enabled: ativo });
  const { data: etiquetas = [] } = useQuery({ ...etiquetasQueryOptions, enabled: ativo });
  const { data: quadros = [] } = useQuery({ ...quadrosQueryOptions, enabled: ativo });
  const { data: checklist = [] } = useQuery({ ...checklistQueryOptions(cardId), enabled: ativo });
  const { data: comentarios = [] } = useQuery({ ...comentariosQueryOptions(cardId), enabled: ativo });
  const { data: anexos = [] } = useQuery({ ...anexosQueryOptions(cardId), enabled: ativo });
  const { data: historico = [] } = useQuery({ ...historicoQueryOptions(cardId), enabled: ativo });
  const [quadroSel, setQuadroSel] = useState<string>("");
  useEffect(() => {
    if (card) setQuadroSel(card.quadro_id);
  }, [card?.id, card?.quadro_id]);
  const { data: quadroDestino } = useQuery({
    ...quadroQueryOptions(quadroSel || card?.quadro_id || ""),
    enabled: ativo && !!(quadroSel || card?.quadro_id),
  });

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [novoItem, setNovoItem] = useState("");
  const [comentario, setComentario] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [confirmTexto, setConfirmTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [arrastandoArq, setArrastandoArq] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (card) {
      setTitulo(card.titulo);
      setDescricao(card.descricao);
    }
  }, [card?.id, card?.titulo, card?.descricao]);

  if (!card) return null;
  const c = card;
  const nomePessoa = (id: string | null) => pessoas.find((p) => p.id === id)?.nome ?? "Ninguém";
  const invalidar = () => qc.invalidateQueries({ queryKey: ["tarefas", "quadro", c.quadro_id] });

  function aplicarLocal(muda: (c: Card) => Card) {
    qc.setQueryData(["tarefas", "quadro", c.quadro_id], (old: QuadroCompleto | null | undefined) => {
      if (!old) return old;
      return { ...old, cards: old.cards.map((x) => (x.id === c.id ? muda(x) : x)) };
    });
  }

  async function salvar(values: CardUpdate, hist?: [string, string]) {
    const antes = c;
    aplicarLocal((x) => ({ ...x, ...values }) as Card);
    try {
      await updateCard(c.id, values);
      if (hist) void registrarHistorico(c.id, hist[0], hist[1]);
      void invalidar();
    } catch (e) {
      aplicarLocal(() => antes);
      toast.error((e as Error).message);
    }
  }

  async function rodar(fn: () => Promise<void>, local?: (c: Card) => Card) {
    const antes = c;
    if (local) aplicarLocal(local);
    try {
      await fn();
      void invalidar();
    } catch (e) {
      if (local) aplicarLocal(() => antes);
      toast.error((e as Error).message);
    }
  }

  async function enviarArquivos(files: FileList | File[]) {
    setEnviando(true);
    try {
      for (const f of Array.from(files)) await uploadAnexo(c.id, f);
      await invalidar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function baixar(path: string) {
    try {
      window.open(await urlAnexo(path), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const feitos = checklist.filter((i) => i.feito).length;
  const colunasDestino = quadroDestino?.colunas ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogTitle className="sr-only">{c.titulo || "Card"}</DialogTitle>
        <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
          {/* Coluna principal */}
          <div className="min-w-0 space-y-5">
            <Input
              value={titulo}
              disabled={!editable}
              className="border-transparent px-1 text-lg font-semibold shadow-none focus-visible:border-input"
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => titulo !== c.titulo && salvar({ titulo })}
            />

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={12}
                className="min-h-[18rem] resize-y"
                value={descricao}
                disabled={!editable}
                onChange={(e) => setDescricao(e.target.value)}
                onBlur={() => descricao !== c.descricao && salvar({ descricao })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Checklist</Label>
                {checklist.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {feitos}/{checklist.length}
                  </span>
                ) : null}
              </div>
              {checklist.length > 0 ? (
                <Progress value={(feitos / checklist.length) * 100} className="h-1.5" />
              ) : null}
              <ul className="space-y-1">
                {checklist.map((i) => (
                  <li key={i.id} className="group flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={i.feito}
                      disabled={!editable}
                      onCheckedChange={(v) => rodar(() => toggleItemChecklist(i.id, !!v))}
                    />
                    <span className={cn("flex-1", i.feito && "text-muted-foreground line-through")}>
                      {i.texto}
                    </span>
                    {editable ? (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100"
                        aria-label="Remover item"
                        onClick={() => rodar(() => deleteItemChecklist(i.id))}
                      >
                        <X className="size-3.5 text-muted-foreground" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {editable ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!novoItem.trim()) return;
                    const t = novoItem;
                    setNovoItem("");
                    rodar(() => addItemChecklist(c.id, t));
                  }}
                >
                  <Input
                    value={novoItem}
                    placeholder="Novo item"
                    className="h-8"
                    onChange={(e) => setNovoItem(e.target.value)}
                  />
                  <Button type="submit" size="sm" variant="outline" aria-label="Adicionar item">
                    <Plus className="size-4" />
                  </Button>
                </form>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Anexos</Label>
              {editable ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastandoArq(true);
                  }}
                  onDragLeave={() => setArrastandoArq(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastandoArq(false);
                    if (e.dataTransfer.files.length) enviarArquivos(e.dataTransfer.files);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground",
                    arrastandoArq && "border-primary bg-primary-soft",
                  )}
                >
                  <Upload className="size-4" />
                  {enviando ? "Enviando..." : "Arraste arquivos aqui ou clique para escolher"}
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => e.target.files && enviarArquivos(e.target.files)}
                  />
                </div>
              ) : null}
              <ul className="space-y-1">
                {anexos.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                    <span className="text-xs text-muted-foreground">{formatarTamanho(a.tamanho)}</span>
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Baixar" onClick={() => baixar(a.path)}>
                      <Download className="size-4" />
                    </Button>
                    {editable ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="Remover anexo"
                        onClick={() => rodar(() => deleteAnexo(a.id, a.path))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Comentários</Label>
              <ul className="space-y-2">
                {comentarios.map((m) => (
                  <li key={m.id} className="rounded-lg bg-secondary/60 p-2 text-sm">
                    <div className="mb-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{nomePessoa(m.autor_id)}</span>
                      {dataHora(m.created_at)}
                      {m.autor_id === meuId || isAdmin ? (
                        <button
                          type="button"
                          className="ml-auto"
                          aria-label="Apagar comentário"
                          onClick={() => rodar(() => deleteComentario(m.id))}
                        >
                          <X className="size-3" />
                        </button>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap">{m.texto}</p>
                  </li>
                ))}
              </ul>
              {editable ? (
                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    value={comentario}
                    placeholder="Escreva um comentário"
                    onChange={(e) => setComentario(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!comentario.trim()}
                    onClick={() => {
                      const t = comentario;
                      setComentario("");
                      rodar(() => addComentario(c.id, t));
                    }}
                  >
                    Comentar
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Lateral */}
          <aside className="space-y-3 text-sm">
            <Campo label="Responsável">
              <Select
                disabled={!editable}
                value={c.responsavel_id ?? NENHUM}
                onValueChange={(v) => {
                  const novo = v === NENHUM ? null : v;
                  salvar({ responsavel_id: novo }, ["Trocou responsável", `${nomePessoa(c.responsavel_id)} → ${nomePessoa(novo)}`]);
                }}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Ninguém</SelectItem>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Data de início">
              <Input type="date" className="h-8" disabled={!editable} value={c.data_inicio ?? ""}
                onChange={(e) => salvar({ data_inicio: e.target.value || null })} />
            </Campo>
            <Campo label="Data de entrega">
              <Input type="date" className="h-8" disabled={!editable} value={c.data_entrega ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  salvar({ data_entrega: v }, ["Mudou entrega", `${formatarData(c.data_entrega) || "sem data"} → ${formatarData(v) || "sem data"}`]);
                }} />
            </Campo>
            <Campo label="Prioridade">
              <Select disabled={!editable} value={c.prioridade ?? NENHUM}
                onValueChange={(v) => salvar({ prioridade: v === NENHUM ? null : (v as Card["prioridade"]) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem prioridade</SelectItem>
                  {PRIORIDADES.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Esforço">
              <Select disabled={!editable} value={c.esforco ?? NENHUM}
                onValueChange={(v) => salvar({ esforco: v === NENHUM ? null : (v as Card["esforco"]) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Não definido</SelectItem>
                  {ESFORCOS.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Etiquetas">
              <div className="flex flex-wrap gap-1">
                {etiquetas.map((e) => {
                  const on = c.etiquetas.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      disabled={!editable}
                      onClick={() => {
                        const novas = on ? c.etiquetas.filter((x) => x !== e.id) : [...c.etiquetas, e.id];
                        rodar(
                          () => setEtiquetasDoCard(c.id, novas),
                          (card) => ({ ...card, etiquetas: novas }),
                        );
                      }}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] transition-opacity",
                        on ? "text-primary-foreground" : "opacity-40",
                      )}
                      style={{ backgroundColor: e.cor, color: "#ffffff" }}
                    >
                      {e.nome}
                    </button>
                  );
                })}
              </div>
            </Campo>
            <Campo label="Adiar até">
              <Input type="date" className="h-8" disabled={!editable} value={c.adiado_ate ?? ""}
                onChange={(e) => salvar({ adiado_ate: e.target.value || null })} />
            </Campo>
            <Campo label="Depende de">
              <Input className="h-8" disabled={!editable} defaultValue={c.depende_de} key={`dep-${c.id}`}
                onBlur={(e) => e.target.value !== c.depende_de && salvar({ depende_de: e.target.value })} />
            </Campo>
            <Campo label="Link externo">
              <Input className="h-8" disabled={!editable} defaultValue={c.link_externo} key={`lnk-${c.id}`}
                placeholder="https://"
                onBlur={(e) => e.target.value !== c.link_externo && salvar({ link_externo: e.target.value })} />
              {c.link_externo ? (
                <a href={c.link_externo} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary underline">
                  {c.link_externo}
                </a>
              ) : null}
            </Campo>
            <Campo label="Quadro">
              <Select disabled={!editable} value={quadroSel} onValueChange={setQuadroSel}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {quadros.map((q) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Coluna">
              <Select
                disabled={!editable || colunasDestino.length === 0}
                value={quadroSel === c.quadro_id ? c.coluna_id : ""}
                onValueChange={(v) => {
                  const origem = quadroSel === c.quadro_id ? colunasDestino.find((x) => x.id === c.coluna_id)?.nome : "outro quadro";
                  const destino = colunasDestino.find((x) => x.id === v)?.nome ?? "";
                  salvar(
                    { quadro_id: quadroSel, coluna_id: v, posicao: 9999 },
                    ["Moveu", `${origem ?? ""} → ${destino}`],
                  );
                }}
              >
                <SelectTrigger className="h-8"><SelectValue placeholder="Escolha a coluna" /></SelectTrigger>
                <SelectContent>
                  {colunasDestino.map((col) => <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>

            {editable ? (
              <div className="space-y-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1"
                  onClick={async () => {
                    await rodar(() => arquivarCard(c.id, !c.arquivado));
                    toast.success(c.arquivado ? "Card restaurado" : "Card arquivado");
                    if (!c.arquivado) onOpenChange(false);
                  }}
                >
                  <Archive className="size-4" /> {c.arquivado ? "Desarquivar" : "Arquivar card"}
                </Button>
                {isAdmin ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1 text-destructive"
                    onClick={() => {
                      setConfirmTexto("");
                      setConfirmar(true);
                    }}
                  >
                    <Trash2 className="size-4" /> Excluir de vez
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Collapsible className="border-t border-border pt-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Histórico <ChevronDown className="size-4" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1.5">
                  {historico.length === 0 ? (
                    <li className="text-xs text-muted-foreground">Sem registros.</li>
                  ) : null}
                  {historico.map((h) => (
                    <li key={h.id} className="text-xs">
                      <span className="font-medium">{nomePessoa(h.autor_id)}</span> {h.acao.toLowerCase()}
                      {h.detalhe ? <span className="text-muted-foreground"> · {h.detalhe}</span> : null}
                      <div className="text-[10px] text-muted-foreground">{dataHora(h.created_at)}</div>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </aside>
        </div>

        <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir card de vez</AlertDialogTitle>
              <AlertDialogDescription>
                Isso não tem volta. Digite o título exato do card para confirmar: <b>{c.titulo}</b>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmTexto} onChange={(e) => setConfirmTexto(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={confirmTexto !== c.titulo}
                onClick={async () => {
                  await rodar(() => deleteCard(c.id));
                  setConfirmar(false);
                  onOpenChange(false);
                  toast.success("Card excluído");
                }}
              >
                Excluir
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
