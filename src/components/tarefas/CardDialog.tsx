import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from "@/components/ui/color-picker";
import { useCardAoVivo } from "@/hooks/use-card-ao-vivo";
import { useCampoEmEdicao } from "@/hooks/use-campo-em-edicao";
import { profileQueryOptions } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, RefreshCw, Download, User, Tag, Clock, CheckSquare, Paperclip, SlidersHorizontal, ExternalLink, Plus, Trash2, Upload, X } from "lucide-react";
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
import { CampoData } from "@/components/tarefas/CampoData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  CORES_ETIQUETA,
  siglaPessoa,
  PRIORIDADES,
  addComentario,
  addItemChecklist,
  anexosQueryOptions,
  arquivarCard,
  baixarAnexo,
  podeMexerNoCard,
  checklistQueryOptions,
  comentariosQueryOptions,
  deleteAnexo,
  deleteCard,
  deleteComentario,
  deleteItemChecklist,
  etiquetasDoQuadro,
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
  formatarDataHora,
  avancarCard,
  ehRecorrente,
  RECORRENCIAS,
  LEMBRETES,
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
  role,
}: {
  card: Card | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editable: boolean;
  isAdmin: boolean;
  meuId: string;
  role?: string | undefined;
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
  const [localCard, setLocalCard] = useState<Card | null>(null);
  useEffect(() => {
    setLocalCard(card ?? null);
  }, [card]);

  useEffect(() => {
    if (card) {
      setTitulo(card.titulo);
      setDescricao(card.descricao);
    }
  }, [card?.id, card?.titulo, card?.descricao]);

  const { data: perfil } = useQuery(profileQueryOptions);
  useCardAoVivo(card?.id ?? null, card?.quadro_id ?? null, ativo);
  const { travados, digitando } = useCampoEmEdicao(card?.id ?? null, ativo, perfil?.id ?? "", perfil?.nome ?? "Alguém");
  const [filtroLinha, setFiltroLinha] = useState<"tudo" | "comentarios" | "atividades">("tudo");
  useEffect(() => {
    setFiltroLinha("tudo");
  }, [card?.id]);

  if (!card) return null;
  const c = localCard && localCard.id === card.id ? localCard : card;
  const mexer = podeMexerNoCard(c, role, meuId, editable);
  const etiquetasVisiveis = etiquetasDoQuadro(etiquetas, c.quadro_id);
  const nomePessoa = (id: string | null) => pessoas.find((p) => p.id === id)?.nome ?? "Ninguém";
  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["tarefas", "quadro", c.quadro_id] });
    void qc.invalidateQueries({ queryKey: ["tarefas", "anexos", c.id] });
    void qc.invalidateQueries({ queryKey: ["tarefas", "checklist", c.id] });
    void qc.invalidateQueries({ queryKey: ["tarefas", "comentarios", c.id] });
    void qc.invalidateQueries({ queryKey: ["tarefas", "historico", c.id] });
  };

  function aplicarLocal(muda: (c: Card) => Card) {
    setLocalCard((atual) => (atual ? muda(atual) : atual));
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
      for (const f of Array.from(files)) {
        await uploadAnexo(c.id, f);
        invalidar();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function baixarArquivo(path: string, nome: string) {
    try {
      await baixarAnexo(path, nome);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function abrirAnexo(path: string) {
    try {
      window.open(await urlAnexo(path), "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const feitos = checklist.filter((i) => i.feito).length;
  const colunasDestino = quadroDestino?.colunas ?? [];
  const pessoaDe = (id: string | null) => pessoas.find((p) => p.id === id);

  type LinhaAtividade =
    | { tipo: "comentario"; id: string; autor_id: string | null; quando: string; texto: string }
    | { tipo: "atividade"; id: string; autor_id: string | null; quando: string; acao: string; detalhe: string };
  const linhas: LinhaAtividade[] = [
    ...comentarios.map((co) => ({ tipo: "comentario" as const, id: co.id, autor_id: co.autor_id, quando: co.created_at, texto: co.texto })),
    ...historico.map((h) => ({ tipo: "atividade" as const, id: h.id, autor_id: h.autor_id, quando: h.created_at, acao: h.acao, detalhe: h.detalhe })),
  ]
    .filter((l) => (filtroLinha === "tudo" ? true : filtroLinha === "comentarios" ? l.tipo === "comentario" : l.tipo === "atividade"))
    .sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0">
        <DialogTitle className="sr-only">{c.titulo || "Card"}</DialogTitle>
        <div className="grid gap-0 md:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          {/* Coluna principal */}
          <div className="min-w-0 space-y-4 p-5">
            <div className="pr-6">
              <Input
                value={titulo}
                disabled={!mexer || !!travados["titulo"]}
                className="border-transparent px-1 text-lg font-semibold shadow-none focus-visible:border-input"
                onChange={(e) => {
                  setTitulo(e.target.value);
                  digitando("titulo");
                }}
                onBlur={() => titulo !== c.titulo && salvar({ titulo })}
              />
              <AvisoEscrevendo quem={travados["titulo"]} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Select
                disabled={!mexer}
                value={c.responsavel_id ?? NENHUM}
                onValueChange={(v) => {
                  const novo = v === NENHUM ? null : v;
                  salvar({ responsavel_id: novo }, ["Trocou responsável", `${nomePessoa(c.responsavel_id)} → ${nomePessoa(novo)}`]);
                }}
              >
                <SelectTrigger className="h-8 w-auto gap-1.5" title={c.responsavel_id ? nomePessoa(c.responsavel_id) : "Ninguém"}>
                  <User className="size-4" />
                  Responsável
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Ninguém</SelectItem>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={!mexer}>
                    <Tag className="size-4" /> Etiquetas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-2">
                  <Campo label="Etiquetas">
                    <div className="flex flex-wrap gap-1">
                      {etiquetasVisiveis.map((e) => {
                        const on = c.etiquetas.includes(e.id);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            disabled={!mexer}
                            onClick={() => {
                              const novas = on ? c.etiquetas.filter((x) => x !== e.id) : [...c.etiquetas, e.id];
                              rodar(
                                () => setEtiquetasDoCard(c.id, novas),
                                (card) => ({ ...card, etiquetas: novas }),
                              );
                            }}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[11px] transition-opacity",
                              !on && "opacity-40",
                            )}
                            style={{ backgroundColor: e.cor, color: e.cor_texto }}
                          >
                            {e.nome}
                          </button>
                        );
                      })}
                      {etiquetasVisiveis.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">
                          Nenhuma etiqueta para este quadro. Crie em Configurações.
                        </span>
                      ) : null}
                    </div>
                  </Campo>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={!mexer}>
                    <Clock className="size-4" /> Datas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-h-[70vh] w-72 space-y-3 overflow-y-auto">
                  <CampoData
                    label="Data de início"
                    data={c.data_inicio}
                    hora={c.hora_inicio}
                    disabled={!mexer}
                    onChange={(d, h) => salvar({ data_inicio: d, hora_inicio: h })}
                  />
                  <CampoData
                    label="Data de entrega"
                    data={c.data_entrega}
                    hora={c.hora_entrega}
                    disabled={!mexer}
                    onChange={(d, h) =>
                      salvar({ data_entrega: d, hora_entrega: h, ...(d ? {} : { recorrencia: "nunca" as const }) }, [
                        "Mudou entrega",
                        `${formatarDataHora(c.data_entrega, c.hora_entrega) || "sem data"} → ${formatarDataHora(d, h) || "sem data"}`,
                      ])
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Recorrente</p>
                    <Select
                      disabled={!mexer || !c.data_entrega}
                      value={c.recorrencia ?? "nunca"}
                      onValueChange={(v) => salvar({ recorrencia: v as Card["recorrencia"] })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECORRENCIAS.map((r) => (
                          <SelectItem key={r.valor} value={r.valor}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!c.data_entrega ? (
                      <p className="text-[11px] text-muted-foreground">
                        Marque uma data de entrega para poder repetir
                      </p>
                    ) : null}
                    {ehRecorrente(c) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 w-full gap-1"
                        disabled={!mexer}
                        onClick={async () => {
                          try {
                            const prox = await avancarCard(c.id);
                            toast.success(prox ? `Próxima em ${formatarData(prox)}` : "Card atualizado");
                          } catch {
                            toast.error("Não deu para avançar");
                          } finally {
                            invalidar();
                          }
                        }}
                      >
                        <RefreshCw className="size-4" /> Já fiz, ir para a próxima
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Lembrete</p>
                    <Select
                      disabled={!mexer || !c.data_entrega}
                      value={c.lembrete_min === null || c.lembrete_min === undefined ? "nenhum" : String(c.lembrete_min)}
                      onValueChange={(v) => salvar({ lembrete_min: v === "nenhum" ? null : Number(v) })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEMBRETES.map((l) => (
                          <SelectItem key={String(l.valor)} value={l.valor === null ? "nenhum" : String(l.valor)}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {!c.data_entrega
                        ? "Marque uma data de entrega para poder ser lembrado"
                        : !c.hora_entrega
                          ? "Sem hora marcada, o aviso aparece no sino à meia noite do dia da entrega"
                          : "O aviso vai para o responsável pelo card"}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!mexer}
                onClick={() => document.getElementById("bloco-checklist")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                <CheckSquare className="size-4" /> Checklist
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!mexer}
                onClick={() => document.getElementById("bloco-anexos")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                <Paperclip className="size-4" /> Anexo
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={!mexer}>
                    <SlidersHorizontal className="size-4" /> Mais
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-h-[70vh] w-72 space-y-3 overflow-y-auto">
                  <Campo label="Cor da faixa">
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        value={c.cor ?? "#378add"}
                        onChange={(v) => salvar({ cor: v.toLowerCase() })}
                        label="Cor da faixa"
                        presets={CORES_ETIQUETA}
                      />
                      {c.cor ? (
                        <Button size="sm" variant="ghost" onClick={() => salvar({ cor: null })}>
                          Tirar cor
                        </Button>
                      ) : null}
                    </div>
                  </Campo>
                  <Campo label="Cor do fundo">
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        value={c.cor_fundo ?? "#378add"}
                        onChange={(v) => salvar({ cor_fundo: v.toLowerCase() })}
                        label="Cor do fundo"
                        presets={CORES_ETIQUETA}
                      />
                      {c.cor_fundo ? (
                        <Button size="sm" variant="ghost" onClick={() => salvar({ cor_fundo: null })}>
                          Voltar ao neutro
                        </Button>
                      ) : null}
                    </div>
                  </Campo>
                  <Campo label="Prioridade">
                    <Select disabled={!mexer} value={c.prioridade ?? NENHUM}
                      onValueChange={(v) => salvar({ prioridade: v === NENHUM ? null : (v as Card["prioridade"]) })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NENHUM}>Sem prioridade</SelectItem>
                        {PRIORIDADES.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Esforço">
                    <Select disabled={!mexer} value={c.esforco ?? NENHUM}
                      onValueChange={(v) => salvar({ esforco: v === NENHUM ? null : (v as Card["esforco"]) })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NENHUM}>Não definido</SelectItem>
                        {ESFORCOS.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Adiar até">
                    <Input type="date" className="h-8" disabled={!mexer} value={c.adiado_ate ?? ""}
                      onChange={(e) => salvar({ adiado_ate: e.target.value || null })} />
                  </Campo>
                  <Campo label="Depende de">
                    <Input className="h-8" disabled={!mexer} defaultValue={c.depende_de} key={`dep-${c.id}`}
                      onBlur={(e) => e.target.value !== c.depende_de && salvar({ depende_de: e.target.value })} />
                  </Campo>
                  <Campo label="Link externo">
                    <Input className="h-8" disabled={!mexer} defaultValue={c.link_externo} key={`lnk-${c.id}`}
                      placeholder="https://"
                      onBlur={(e) => e.target.value !== c.link_externo && salvar({ link_externo: e.target.value })} />
                    {c.link_externo ? (
                      <a href={c.link_externo} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary underline">
                        {c.link_externo}
                      </a>
                    ) : null}
                  </Campo>
                  <Campo label="Quadro">
                    <Select disabled={!mexer} value={quadroSel} onValueChange={setQuadroSel}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {quadros.map((q) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Coluna">
                    <Select
                      disabled={!mexer || colunasDestino.length === 0}
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
                </PopoverContent>
              </Popover>
            </div>

            {c.responsavel_id || c.etiquetas.length > 0 || c.data_entrega || c.prioridade ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {c.responsavel_id ? (
                  <span
                    className="flex size-6 items-center justify-center rounded-full text-[9px] font-semibold"
                    style={{
                      backgroundColor: pessoaDe(c.responsavel_id)?.cor_avatar ?? "#378add",
                      color: pessoaDe(c.responsavel_id)?.cor_texto_avatar ?? "#ffffff",
                    }}
                    title={nomePessoa(c.responsavel_id)}
                  >
                    {siglaPessoa(pessoaDe(c.responsavel_id) ?? { nome: "", sigla: null })}
                  </span>
                ) : null}
                {c.etiquetas
                  .map((id) => etiquetas.find((e) => e.id === id))
                  .filter((e): e is NonNullable<typeof e> => !!e)
                  .map((e) => (
                    <span
                      key={e.id}
                      className="rounded-[3px] px-1 py-px text-[10px] font-medium uppercase"
                      style={{ backgroundColor: e.cor, color: e.cor_texto }}
                    >
                      {e.nome}
                    </span>
                  ))}
                {c.data_entrega ? (
                  <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    entrega {formatarDataHora(c.data_entrega, c.hora_entrega)}
                  </span>
                ) : null}
                {c.prioridade ? (
                  <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {PRIORIDADES.find((p) => p.valor === c.prioridade)?.label ?? c.prioridade}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={16}
                className="min-h-[24rem] resize-y"
                value={descricao}
                disabled={!mexer || !!travados["descricao"]}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  digitando("descricao");
                }}
                onBlur={() => descricao !== c.descricao && salvar({ descricao })}
              />
              <AvisoEscrevendo quem={travados["descricao"]} />
            </div>

            <div className="space-y-2" id="bloco-checklist">
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
                      disabled={!mexer}
                      onCheckedChange={(v) => rodar(() => toggleItemChecklist(i.id, !!v))}
                    />
                    <span className={cn("flex-1", i.feito && "text-muted-foreground line-through")}>
                      {i.texto}
                    </span>
                    {mexer ? (
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
              {mexer ? (
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

            <div className="space-y-2" id="bloco-anexos">
              <Label>Anexos</Label>
              {mexer ? (
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
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Abrir no navegador"
                      onClick={() => abrirAnexo(a.path)}>
                      <ExternalLink className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Baixar arquivo"
                      onClick={() => baixarArquivo(a.path, a.nome)}>
                      <Download className="size-4" />
                    </Button>
                    {mexer ? (
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
          </div>

          {/* Comentários e atividade */}
          <aside className="space-y-3 border-l border-border bg-muted/30 p-5 text-sm">
            {editable && !mexer ? (
              <p className="text-xs text-muted-foreground">Só o responsável mexe neste card.</p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Comentários e atividade</Label>
              <div className="inline-flex overflow-hidden rounded-md border border-border text-[11px]">
                {([
                  ["tudo", "Tudo"],
                  ["comentarios", "Só comentários"],
                  ["atividades", "Só atividades"],
                ] as const).map(([valor, rotulo], i) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setFiltroLinha(valor)}
                    className={cn(
                      "px-2 py-1",
                      i > 0 && "border-l border-border",
                      filtroLinha === valor ? "bg-primary-soft font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
              {editable ? (
                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    value={comentario}
                    placeholder="Escreva um comentário"
                    disabled={!!travados["comentario"]}
                    onChange={(e) => {
                      setComentario(e.target.value);
                      digitando("comentario");
                    }}
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
                  <AvisoEscrevendo quem={travados["comentario"]} />
                </div>
              ) : null}
            <ul className="space-y-3">
              {linhas.length === 0 ? <li className="text-xs text-muted-foreground">Nada por aqui ainda.</li> : null}
              {linhas.map((l) => (
                <li key={`${l.tipo}-${l.id}`} className="group flex gap-2">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                      l.tipo === "atividade" && "opacity-60",
                    )}
                    style={{
                      backgroundColor: pessoaDe(l.autor_id)?.cor_avatar ?? "#888780",
                      color: pessoaDe(l.autor_id)?.cor_texto_avatar ?? "#ffffff",
                    }}
                  >
                    {siglaPessoa(pessoaDe(l.autor_id) ?? { nome: "", sigla: null })}
                  </span>
                  <div className="min-w-0 flex-1">
                    {l.tipo === "comentario" ? (
                      <p className="whitespace-pre-wrap break-words text-xs">
                        <span className="font-medium">{nomePessoa(l.autor_id)}</span> {l.texto}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {nomePessoa(l.autor_id)} {l.acao.toLowerCase()}
                        {l.detalhe ? ` · ${l.detalhe}` : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {dataHora(l.quando)}
                      {l.tipo === "comentario" && (l.autor_id === meuId || isAdmin) ? (
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100"
                          aria-label="Apagar comentário"
                          onClick={() => rodar(() => deleteComentario(l.id))}
                        >
                          <X className="size-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {mexer ? (
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


function AvisoEscrevendo({ quem }: { quem?: string | undefined }) {
  if (!quem) return null;
  return <p className="mt-1 text-[11px] text-muted-foreground">{quem} está escrevendo agora</p>;
}
