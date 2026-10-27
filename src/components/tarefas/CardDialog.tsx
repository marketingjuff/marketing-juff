import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from "@/components/ui/color-picker";
import { useCardAoVivo } from "@/hooks/use-card-ao-vivo";
import { useCampoEmEdicao } from "@/hooks/use-campo-em-edicao";
import { canEdit, profileQueryOptions } from "@/lib/auth";
import { TrilhoEtiquetas } from "./TrilhoEtiquetas";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, Users, RefreshCw, Download, User, Clock, CheckSquare, Paperclip, SlidersHorizontal, ExternalLink, Plus, Trash2, Upload, X, Pencil, CheckCircle2, RotateCcw, Copy } from "lucide-react";
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
import { EditorDescricao } from "./EditorDescricao";
import { EditorComentario, comentarioVazio, htmlDeComentario } from "./EditorComentario";
import DOMPurify from "dompurify";
import { usePresetsMarca } from "@/hooks/use-presets-marca";
import {
  ESFORCOS,
  siglaPessoa,
  setMembrosDoCard,
  diasParado,
  PRIORIDADES,
  addComentario,
  addItemChecklist,
  anexosQueryOptions,
  arquivarCard,
  concluirCard,
  reabrirCard,
  duplicarCard,
  baixarAnexo,
  podeMexerNoCard,
  checklistQueryOptions,
  comentariosQueryOptions,
  coresSalvasQueryOptions,
  criarCorSalva,
  excluirCorSalva,
  deleteAnexo,
  deleteCard,
  deleteComentario,
  updateComentario,
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
  anexosNaDescricao,
  urlAnexo,
  formatarDataHora,
  avancarCard,
  ehRecorrente,
  RECORRENCIAS,
  LEMBRETES,
  type Card,
  type CardUpdate,
  type QuadroCompleto,
  coresDaEtiqueta,
} from "@/lib/tarefas";

const NENHUM = "__nenhum__";

function balaoCor(hex: string | null | undefined): { fundo: string; texto: string } {
  const base = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#888780";
  const n = parseInt(base.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mist = (c: number) => Math.round(c * 0.32 + 255 * 0.68);
  const fundo = `#${[mist(r), mist(g), mist(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return { fundo, texto: "#1f2937" };
}

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
  const { data: coresSalvas = [] } = useQuery({ ...coresSalvasQueryOptions, enabled: ativo });
  const presetsMarca = usePresetsMarca();
  const guardarCor = async (hex: string) => {
    try {
      await criarCorSalva(hex);
      void qc.invalidateQueries({ queryKey: coresSalvasQueryOptions.queryKey });
    } catch {
      toast.error("Não foi possível salvar a cor");
    }
  };
  const tirarCorSalva = async (hex: string) => {
    try {
      await excluirCorSalva(hex);
      void qc.invalidateQueries({ queryKey: coresSalvasQueryOptions.queryKey });
    } catch {
      toast.error("Não foi possível remover a cor");
    }
  };
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
  const [adicionandoItens, setAdicionandoItens] = useState(false);
  const adicionandoItensRef = useRef(false);
  const [comentario, setComentario] = useState("");
  const [editandoComentario, setEditandoComentario] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [confirmTexto, setConfirmTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoDescricaoRef = useRef(false);
  const [arrastandoArq, setArrastandoArq] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coladasRef = useRef(new Map<string, string>());
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
  const [filtroLinha, setFiltroLinha] = useState<"tudo" | "comentarios" | "atividades">("comentarios");
  useEffect(() => {
    setFiltroLinha("comentarios");
    setEditandoComentario(null);
    setTextoEdicao("");
  }, [card?.id]);

  if (!card) return null;
  const c = localCard && localCard.id === card.id ? localCard : card;
  const membros = c.membros.filter((id) => id !== c.responsavel_id);
  const podeMexer = podeMexerNoCard(c, role, meuId, editable);
  const mexer = podeMexer && !c.concluido;
  const etiquetasVisiveis = etiquetasDoQuadro(etiquetas, c.quadro_id);
  const cardsPrivados = quadros.find((q) => q.id === c.quadro_id)?.cards_privados ?? false;
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

  async function adicionarItensChecklist(texto: string) {
    const itens = texto.split(/\r\n|[\n\r\u2028\u2029]/).map((linha) => linha.trim()).filter(Boolean);
    if (!itens.length || adicionandoItensRef.current) return;
    adicionandoItensRef.current = true;
    setAdicionandoItens(true);
    setNovoItem("");
    let salvos = 0;
    try {
      for (const item of itens) {
        await addItemChecklist(c.id, item);
        salvos += 1;
      }
    } catch (e) {
      setNovoItem(itens.slice(salvos).join("\n"));
      toast.error((e as Error).message);
    } finally {
      invalidar();
      adicionandoItensRef.current = false;
      setAdicionandoItens(false);
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
    | { tipo: "comentario"; id: string; autor_id: string | null; quando: string; texto: string; editado_em: string | null }
    | { tipo: "atividade"; id: string; autor_id: string | null; quando: string; acao: string; detalhe: string };
  const linhas: LinhaAtividade[] = [
    ...comentarios.map((co) => ({ tipo: "comentario" as const, id: co.id, autor_id: co.autor_id, quando: co.created_at, texto: co.texto, editado_em: co.editado_em })),
    ...historico.map((h) => ({ tipo: "atividade" as const, id: h.id, autor_id: h.autor_id, quando: h.created_at, acao: h.acao, detalhe: h.detalhe })),
  ]
    .filter((l) => (filtroLinha === "tudo" ? true : filtroLinha === "comentarios" ? l.tipo === "comentario" : l.tipo === "atividade"))
    .sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && enviandoDescricaoRef.current) {
        toast.info("Aguarde as imagens terminarem de enviar e salvar antes de fechar o card.");
        return;
      }
      onOpenChange(v);
    }}>
      <DialogContent className="max-h-[92vh] max-w-[90rem] overflow-y-auto p-0">
        <DialogTitle className="sr-only">{c.titulo || "Card"}</DialogTitle>
        <div className="grid gap-0 md:grid-cols-2">
          {/* Coluna principal */}
          <div className="min-w-0 space-y-3 p-5">
            <div className="-mb-1 pr-6">
              <Input
                value={titulo}
                disabled={!mexer || !!travados["titulo"]}
                className="border-transparent px-1 text-[22px] font-semibold shadow-none focus-visible:border-input"
                onChange={(e) => {
                  setTitulo(e.target.value);
                  digitando("titulo");
                }}
                onBlur={() => titulo !== c.titulo && salvar({ titulo })}
              />
              <AvisoEscrevendo quem={travados["titulo"]} />
            </div>
            <div className="space-y-0">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 px-[6px] py-1">
              <Select
                disabled={!mexer}
                value={c.responsavel_id ?? NENHUM}
                onValueChange={(v) => {
                  const novo = v === NENHUM ? null : v;
                  salvar({ responsavel_id: novo }, ["Trocou responsável", `${nomePessoa(c.responsavel_id)} → ${nomePessoa(novo)}`]);
                }}
              >
                <SelectTrigger className="h-[25px] w-auto gap-1 border-border/70 py-0 pl-1 pr-[7px] text-[12px]" title={c.responsavel_id ? nomePessoa(c.responsavel_id) : "Ninguém"}>
                  {c.responsavel_id ? (
                    <span
                      className="flex size-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                      style={{
                        backgroundColor: pessoaDe(c.responsavel_id)?.cor_avatar ?? "#378add",
                        color: pessoaDe(c.responsavel_id)?.cor_texto_avatar ?? "#ffffff",
                      }}
                    >
                      {siglaPessoa(pessoaDe(c.responsavel_id) ?? { nome: "", sigla: null })}
                    </span>
                  ) : (
                    <User className="size-3.5 shrink-0" />
                  )}
                  <span className="max-w-[9rem] truncate">
                    {c.responsavel_id ? nomePessoa(c.responsavel_id) : "Responsável"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Ninguém</SelectItem>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cardsPrivados ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-[25px] gap-1 px-[7px] text-[12px]" disabled={!mexer}>
                      <Users className="size-3.5" /> Membros
                      {membros.length > 0 ? (
                        <span className="rounded bg-background px-1 text-[10px] leading-tight">
                          {membros.length}
                        </span>
                      ) : null}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-h-[60vh] w-72 space-y-2 overflow-y-auto">
                    <Label>Membros do card</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Quem está aqui enxerga e edita o card, igual a quem é responsável. O card não
                      entra no Meu trabalho de quem é só membro.
                    </p>
                    {pessoas.filter((p) => p.id !== c.responsavel_id).map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={membros.includes(p.id)}
                          disabled={!mexer}
                          onCheckedChange={(v) => {
                            const novas = v
                              ? [...membros, p.id]
                              : membros.filter((x) => x !== p.id);
                            void rodar(async () => {
                              await setMembrosDoCard(c.id, novas);
                              void registrarHistorico(c.id, v ? "Entrou como membro" : "Saiu de membro", nomePessoa(p.id));
                            }, (x) => ({ ...x, membros: novas }));
                          }}
                        />
                        {p.nome || "Sem nome"}
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : null}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-[25px] gap-1 px-[7px] text-[12px]" disabled={!mexer}>
                    <Clock className="size-3.5" />
                    {c.data_entrega ? formatarDataHora(c.data_entrega, c.hora_entrega) : "Datas"}
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
                    <p className="text-[14px] font-medium text-muted-foreground">Recorrente</p>
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
                      <p className="text-[13px] text-muted-foreground">
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
                    <p className="text-[14px] font-medium text-muted-foreground">Lembrete</p>
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
                    <p className="text-[13px] text-muted-foreground">
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
                className="h-[25px] gap-1 px-[7px] text-[12px]"
                disabled={!mexer}
                onClick={() => document.getElementById("bloco-checklist")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                <CheckSquare className="size-3.5" /> Checklist
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-[25px] gap-1 px-[7px] text-[12px]"
                disabled={!mexer}
                onClick={() => document.getElementById("bloco-anexos")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                <Paperclip className="size-3.5" /> Anexo
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-[25px] gap-1 px-[7px] text-[12px]" disabled={!mexer}>
                    <SlidersHorizontal className="size-3.5" /> Mais
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-h-[70vh] w-72 space-y-3 overflow-y-auto">
                  <Campo label="Cor da faixa">
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        value={c.cor ?? "#378add"}
                        onChange={(v) => salvar({ cor: v.toLowerCase() })}
                        label="Cor da faixa"
                        presets={presetsMarca}
                        salvas={coresSalvas}
                        onSalvarAtual={guardarCor}
                        onRemoverSalva={tirarCorSalva}
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
                        presets={presetsMarca}
                        salvas={coresSalvas}
                        onSalvarAtual={guardarCor}
                        onRemoverSalva={tirarCorSalva}
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
                      <a href={c.link_externo} target="_blank" rel="noreferrer" className="block truncate text-[14px] text-primary underline">
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
                  <p className="text-[11px] text-muted-foreground">
                    Parado nesta coluna há {diasParado(c.coluna_desde)}{" "}
                    {diasParado(c.coluna_desde) === 1 ? "dia" : "dias"}.
                  </p>
                  {mexer ? (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={async () => {
                          await rodar(() => arquivarCard(c.id, !c.arquivado));
                          toast.success(c.arquivado ? "Card restaurado" : "Card arquivado");
                          if (!c.arquivado) onOpenChange(false);
                        }}
                      >
                        <Archive className="size-4" /> {c.arquivado ? "Desarquivar" : "Arquivar"}
                      </Button>
                      {isAdmin ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive"
                          onClick={() => {
                            setConfirmTexto("");
                            setConfirmar(true);
                          }}
                        >
                          <Trash2 className="size-4" /> Excluir
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>
              {c.prioridade ? (
                <span className="rounded bg-background px-1.5 py-[2px] text-[11px] uppercase leading-tight text-muted-foreground">
                  {PRIORIDADES.find((p) => p.valor === c.prioridade)?.label ?? c.prioridade}
                </span>
              ) : null}

              {podeMexer ? (
                <>
                  <span className="flex-1" />
                  {c.concluido ? (
                    <span className="flex items-center gap-1 px-1 text-[11px] font-medium text-success">
                      <CheckCircle2 className="size-3" /> Concluído
                    </span>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    title="Duplicar card"
                    aria-label="Duplicar card"
                    className="size-[25px] shrink-0 p-0"
                    onClick={async () => {
                      await rodar(() => duplicarCard(c));
                      toast.success("Cópia criada na primeira coluna");
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  {c.concluido ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-[25px] shrink-0 gap-1 px-2 text-[11px]"
                      onClick={async () => {
                        await rodar(() => reabrirCard(c));
                        toast.success("Card reaberto");
                      }}
                    >
                      <RotateCcw className="size-3" /> Reabrir
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-[25px] shrink-0 gap-1 px-2 text-[11px]"
                      onClick={async () => {
                        await rodar(() => concluirCard(c.id));
                        toast.success("Card concluído");
                      }}
                    >
                      <CheckCircle2 className="size-3" /> Concluir
                    </Button>
                  )}
                </>
              ) : null}
            </div>
            <TrilhoEtiquetas
              quadroId={c.quadro_id}
              cardId={c.id}
              etiquetasDoQuadro={etiquetasVisiveis}
              etiquetasDoCard={c.etiquetas}
              todasEtiquetas={etiquetas}
              pessoas={pessoas}
              responsavelId={c.responsavel_id}
              membros={membros}
              mostrarMembros={cardsPrivados}
              mexer={mexer}
              podeCriar={canEdit(perfil ?? null, "tarefas.quadros")}
              onToggle={(novas) => {
                rodar(
                  () => setEtiquetasDoCard(c.id, novas),
                  (card) => ({ ...card, etiquetas: novas }),
                );
              }}
              onCriada={async (id) => {
                const novas = [...new Set([...c.etiquetas, id])];
                await setEtiquetasDoCard(c.id, novas);
                aplicarLocal((card) => ({ ...card, etiquetas: novas }));
                invalidar();
              }}
            />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <EditorDescricao
                key={c.id}
                value={descricao}
                disabled={!mexer || !!travados["descricao"]}
                onEnvioChange={(v) => { enviandoDescricaoRef.current = v; }}
                onDescartarImagem={async ({ id, path }) => {
                  await deleteAnexo(id, path);
                  void qc.invalidateQueries({ queryKey: ["tarefas", "anexos", c.id] });
                }}
                onChange={(html) => {
                  setDescricao(html);
                  digitando("descricao");
                }}
                onColarImagem={async (f) => {
                  try {
                    const r = await uploadAnexo(c.id, f);
                    void qc.invalidateQueries({ queryKey: ["tarefas", "anexos", c.id] });
                    void qc.invalidateQueries({ queryKey: ["tarefas", "quadro", c.quadro_id] });
                    return r;
                  } catch {
                    toast.error("Não consegui anexar a imagem.");
                    return null;
                  }
                }}
                onBlur={async (html) => {
                  if (html === c.descricao) return;
                  const antes = anexosNaDescricao(c.descricao ?? "");
                  const agora = anexosNaDescricao(html);
                  await salvar({ descricao: html });
                  const sairam = [...antes].filter(([id]) => !agora.has(id));
                  if (sairam.length) {
                    void Promise.all(sairam.map(([id, path]) => deleteAnexo(id, path).catch(() => {}))).then(() => {
                      void qc.invalidateQueries({ queryKey: ["tarefas", "anexos", c.id] });
                      void qc.invalidateQueries({ queryKey: ["tarefas", "quadro", c.quadro_id] });
                    });
                  }
                }}
              />
              <AvisoEscrevendo quem={travados["descricao"]} />
            </div>

            <div className="space-y-2" id="bloco-checklist">
              <div className="flex items-center justify-between">
                <Label>Checklist</Label>
                {checklist.length > 0 ? (
                  <span className="text-[14px] text-muted-foreground">
                    {feitos}/{checklist.length}
                  </span>
                ) : null}
              </div>
              {checklist.length > 0 ? (
                <Progress value={(feitos / checklist.length) * 100} className="h-1.5" />
              ) : null}
              <ul className="space-y-1">
                {checklist.map((i) => (
                  <li key={i.id} className="group flex items-center gap-2 text-[17px]">
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
                    void adicionarItensChecklist(novoItem);
                  }}
                >
                  <Input
                    value={novoItem}
                    placeholder="Novo item"
                    className="h-8"
                    disabled={adicionandoItens}
                    onPaste={(e) => {
                      const texto = e.clipboardData.getData("text/plain");
                      if (!/[\n\r\u2028\u2029]/.test(texto)) return;
                      e.preventDefault();
                      const inicio = e.currentTarget.selectionStart ?? novoItem.length;
                      const fim = e.currentTarget.selectionEnd ?? inicio;
                      void adicionarItensChecklist(novoItem.slice(0, inicio) + texto + novoItem.slice(fim));
                    }}
                    onChange={(e) => setNovoItem(e.target.value)}
                  />
                  <Button type="submit" size="sm" variant="outline" aria-label="Adicionar item" disabled={adicionandoItens}>
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
                    "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-[14px] text-muted-foreground",
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
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-[17px]"
                  >
                    <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                    <span className="text-[14px] text-muted-foreground">{formatarTamanho(a.tamanho)}</span>
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
          <aside className="space-y-3 border-l border-border bg-muted/30 p-5 text-[17px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Comentários e atividade</Label>
              <div className="inline-flex overflow-hidden rounded-md border border-border text-[13px]">
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
                  <EditorComentario
                    value={comentario}
                    placeholder="Escreva um comentário"
                    disabled={!!travados["comentario"]}
                    onChange={(html) => {
                      setComentario(html);
                      digitando("comentario");
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={comentarioVazio(comentario)}
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
              {linhas.length === 0 ? <li className="text-[14px] text-muted-foreground">Nada por aqui ainda.</li> : null}
              {linhas.map((l) => {
                const meuComentario = l.tipo === "comentario" && l.autor_id === meuId;
                if (l.tipo === "comentario") {
                  return (
                    <li
                      key={`${l.tipo}-${l.id}`}
                      className={cn("group flex gap-2", meuComentario && "flex-row-reverse")}
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                        style={{
                          backgroundColor: pessoaDe(l.autor_id)?.cor_avatar ?? "#888780",
                          color: pessoaDe(l.autor_id)?.cor_texto_avatar ?? "#ffffff",
                        }}
                      >
                        {siglaPessoa(pessoaDe(l.autor_id) ?? { nome: "", sigla: null })}
                      </span>
                      <div className={cn("flex max-w-[85%] min-w-0 flex-col", meuComentario ? "items-end" : "items-start")}>
                        <span className="text-[12px] text-muted-foreground">{nomePessoa(l.autor_id)}</span>
                        {editandoComentario === l.id ? (
                          <div className="w-[22rem] max-w-full space-y-2">
                            <EditorComentario value={textoEdicao} onChange={setTextoEdicao} />
                            <div className={cn("flex gap-2", meuComentario ? "justify-end" : "")}>
                              <Button
                                size="sm"
                                disabled={comentarioVazio(textoEdicao)}
                                onClick={() => {
                                  const t = textoEdicao;
                                  setEditandoComentario(null);
                                  rodar(() => updateComentario(l.id, t));
                                }}
                              >
                                Salvar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditandoComentario(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={cn(
                                "break-words rounded-2xl px-3 py-2 text-[14px] font-medium",
                                meuComentario ? "rounded-br-sm" : "rounded-bl-sm",
                              )}
                              style={(() => {
                                const bc = balaoCor(pessoaDe(l.autor_id)?.cor_avatar);
                                return { backgroundColor: bc.fundo, color: bc.texto };
                              })()}
                            >
                              <div
                                className="comentario-rico"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlDeComentario(l.texto)) }}
                              />
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-2 text-[12px] text-muted-foreground",
                                meuComentario ? "flex-row-reverse" : "",
                              )}
                            >
                              <span>{dataHora(l.quando)}</span>
                              {l.editado_em ? (
                                <span title={`Editado em ${dataHora(l.editado_em)}`}>editado</span>
                              ) : null}
                              {editable && l.autor_id === meuId ? (
                                <Button
                                variant="ghost"
                                size="icon"
                                  type="button"
                                  className="size-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                  aria-label="Editar comentário"
                                  onClick={() => {
                                    setTextoEdicao(htmlDeComentario(l.texto));
                                    setEditandoComentario(l.id);
                                  }}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                              ) : null}
                              {l.autor_id === meuId || isAdmin ? (
                                <Button
                                variant="ghost"
                                size="icon"
                                  type="button"
                                  className="size-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                  aria-label="Apagar comentário"
                                  onClick={() => rodar(() => deleteComentario(l.id))}
                                >
                                  <X className="size-3" />
                                </Button>
                              ) : null}
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={`${l.tipo}-${l.id}`} className="group flex gap-2">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold opacity-60"
                      style={{
                        backgroundColor: pessoaDe(l.autor_id)?.cor_avatar ?? "#888780",
                        color: pessoaDe(l.autor_id)?.cor_texto_avatar ?? "#ffffff",
                      }}
                    >
                      {siglaPessoa(pessoaDe(l.autor_id) ?? { nome: "", sigla: null })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] text-muted-foreground">
                        {nomePessoa(l.autor_id)} {l.acao.toLowerCase()}
                        {l.detalhe ? ` · ${l.detalhe}` : ""}
                      </p>
                      <div className="text-[12px] text-muted-foreground">{dataHora(l.quando)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {mexer ? null : null}
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
      <Label className="text-[14px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}


function AvisoEscrevendo({ quem }: { quem?: string | undefined }) {
  if (!quem) return null;
  return <p className="mt-1 text-[13px] text-muted-foreground">{quem} está escrevendo agora</p>;
}
