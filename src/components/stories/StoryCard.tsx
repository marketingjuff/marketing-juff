import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  GripVertical,
  Check,
  CheckCheck,
  MessageSquare,
  Trash2,
  Plus,
  ImageUp,
  Copy,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import type { Composicao, Frame as FrameType, FrameStatus, Story } from "@/lib/stories";
import { MAX_FRAMES, blocoTipo, ehImagemAceita } from "@/lib/stories";
import { ArteEditor, FileiraPresets } from "@/components/stories/ArteEditor";
import { exportarBlocoMontado, logosQueryOptions } from "@/lib/story-editor";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LinhaAlturasProvider,
  useAlturaCompartilhada,
  type SlotAltura,
} from "@/components/stories/AlturasCompartilhadas";
import { precisaLink } from "@/lib/story-plan";
import { ctasQueryOptions, linksQueryOptions } from "@/lib/story-ctas";

/** Valor sentinela do select, porque a lista suspensa não aceita valor vazio. */
const SEM_CTA = "__sem_cta__";

const FRAME_STATUS_LABEL: Record<FrameStatus, string> = {
  pendente: "Pendente",
  ajustar: "Ajustar",
  refeito: "Refeito",
  aprovado: "Aprovado",
};

const FRAME_STATUS_BADGE: Record<FrameStatus, string> = {
  pendente: "bg-muted text-muted-foreground border-border",
  ajustar: "bg-warning/25 text-foreground border-warning",
  refeito: "bg-success/15 text-foreground border-success/50",
  aprovado: "bg-success text-background border-success",
};

const STATUS_BORDER: Record<Story["status"], string> = {
  pendente: "border-warning/60",
  aprovado: "border-success/60",
  ajustar: "border-destructive/60",
};

/** Impede que digitar ou selecionar texto inicie o arraste do dnd-kit. */
const stopDrag = {
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
  onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
};

function Salvo({ visivel }: { visivel: boolean }) {
  if (!visivel) return null;
  return <span className="text-[10px] font-medium text-success">Salvo</span>;
}

/** Altura mínima equivalente a duas linhas. */
const MIN_DUAS_LINHAS = 44;

/** Campo de várias linhas que cresce sozinho e grava só quando perde o foco. */
function AutoTextarea({
  label,
  value,
  disabled,
  onCommit,
  slot,
  frameId,
  compacto,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onCommit: (v: string) => Promise<void>;
  slot: SlotAltura;
  frameId: string;
  compacto?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [salvo, setSalvo] = useState(false);
  const [natural, setNatural] = useState(MIN_DUAS_LINHAS);
  const ref = useRef<HTMLTextAreaElement>(null);

  const compartilhada = useAlturaCompartilhada(slot, frameId, natural);

  useEffect(() => setLocal(value), [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sempre medir a partir do zero, para a altura aplicada não contaminar a medição.
    el.style.height = "auto";
    const medida = Math.max(el.scrollHeight, MIN_DUAS_LINHAS);
    setNatural((atual) => (atual === medida ? atual : medida));
    el.style.height = `${Math.max(medida, compartilhada)}px`;
  }, [local, compartilhada]);

  return (
    <div className="space-y-1" {...stopDrag}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Salvo visivel={salvo} />
      </div>
      <Textarea
        ref={ref}
        rows={2}
        value={local}
        disabled={disabled}
        className={cn("min-h-0 resize-y text-sm", compacto && "py-1.5 text-[13px] leading-[1.3]")}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={async () => {
          if (local === value) return;
          await onCommit(local);
          setSalvo(true);
          setTimeout(() => setSalvo(false), 2000);
        }}
      />
    </div>
  );
}

/** Container que reserva espaço na grade, medindo o filho e aplicando minHeight fora. */
function SlotCompartilhado({
  slot,
  frameId,
  children,
}: {
  slot: SlotAltura;
  frameId: string;
  children: React.ReactNode;
}) {
  const filhoRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState(0);
  const altura = useAlturaCompartilhada(slot, frameId, natural);

  useLayoutEffect(() => {
    const medida = filhoRef.current?.offsetHeight ?? 0;
    setNatural((atual) => (atual === medida ? atual : medida));
  });

  return (
    <div style={{ minHeight: altura }}>
      <div ref={filhoRef}>{children}</div>
    </div>
  );
}

function ArteBloco({
  frame,
  index,
  total,
  editable,
  canApprove,
  onSaveFrame,
  onSaveComp,
  onApproveFrame,
  onAdjustFrame,
  onReplaceImage,
}: {
  frame: FrameType;
  index: number;
  total: number;
  editable: boolean;
  canApprove: boolean;
  onSaveFrame: (frameId: string, values: Partial<FrameType>) => Promise<void>;
  onSaveComp: (frameId: string, patch: Partial<Composicao>) => void;
  onApproveFrame: (frameId: string) => void;
  onAdjustFrame: (frameId: string, comment: string) => void;
  onReplaceImage: (frame: FrameType, file: File) => void;
}) {
  const [ajusteAberto, setAjusteAberto] = useState(false);
  const [comentario, setComentario] = useState("");

  const [ctaSalvo, setCtaSalvo] = useState(false);
  const [linkSalvo, setLinkSalvo] = useState(false);
  const { data: ctas = [] } = useQuery(ctasQueryOptions);
  const { data: links = [] } = useQuery(linksQueryOptions);
  const trocaRef = useRef<HTMLInputElement>(null);

  const ctasAtivos = ctas.filter((c) => !c.arquivado);
  const linksAtivos = links.filter((l) => !l.arquivado);
  const gruposCta = [...new Set(ctasAtivos.map((c) => c.grupo))];
  const ctaForaDoCadastro = frame.cta.length > 0 && !ctasAtivos.some((c) => c.texto === frame.cta);
  const linkForaDoCadastro =
    frame.cta_link.length > 0 && !linksAtivos.some((l) => l.url === frame.cta_link);
  const linkFaltando = precisaLink(frame);

  const draggable = useDraggable({
    id: `frame:${frame.id}`,
    data: { type: "frame", frameId: frame.id, storyId: frame.story_id, index },
    disabled: !editable,
  });
  const droppable = useDroppable({
    id: `frameslot:${frame.id}`,
    data: { type: "frameslot", frameId: frame.id, storyId: frame.story_id, index },
  });

  return (
    <div className="w-[clamp(9.5rem,14vw,12.5rem)] shrink-0 space-y-2 rounded-lg border border-border p-2">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          Arte {index + 1}/{total}
        </span>
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            FRAME_STATUS_BADGE[frame.status],
          )}
        >
          {FRAME_STATUS_LABEL[frame.status]}
        </span>
      </div>

      <div
        ref={droppable.setNodeRef}
        className={cn(
          "relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-muted",
          droppable.isOver && "ring-2 ring-primary",
          draggable.isDragging && "opacity-40",
        )}
      >
        <button
          type="button"
          ref={draggable.setNodeRef}
          {...draggable.attributes}
          {...draggable.listeners}
          className="size-full touch-none"
          aria-label={`Arte ${index + 1}`}
        >
          {frame.url ? (
            <img
              src={frame.url}
              alt={`Arte ${index + 1}`}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="size-full select-none object-cover"
            />
          ) : null}
        </button>
        <ArteEditor
          frame={frame}
          editable={editable}
          podeGerir={canApprove}
          onSaveComp={onSaveComp}
          onSaveTexto={(id, texto) => onSaveFrame(id, { texto_principal: texto })}
        />
      </div>

      <p className="truncate text-[11px] text-muted-foreground" title={frame.nome_arquivo}>
        {frame.nome_arquivo || "Sem nome"}
      </p>

      <FileiraPresets
        comp={frame.comp}
        editable={editable}
        onAplicar={(patch) => onSaveComp(frame.id, patch)}
      />
      <AutoTextarea
        label="Observação"
        value={frame.observacao}
        disabled={!editable}
        slot="observacao"
        frameId={frame.id}
        compacto
        onCommit={(v) => onSaveFrame(frame.id, { observacao: v })}
      />

      <div className="space-y-1" {...stopDrag}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">CTA</span>
          <Salvo visivel={ctaSalvo} />
        </div>
        <Select
          value={frame.cta || SEM_CTA}
          disabled={!editable}
          onValueChange={async (v) => {
            const texto = v === SEM_CTA ? "" : v;
            if (texto === frame.cta) return;
            await onSaveFrame(frame.id, {
              cta: texto,
              ...(texto ? {} : { cta_link: "" }),
            });
            setCtaSalvo(true);
            setTimeout(() => setCtaSalvo(false), 2000);
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_CTA}>Sem CTA</SelectItem>
            {gruposCta.map((grupo) => (
              <SelectGroup key={grupo}>
                <SelectLabel>{grupo}</SelectLabel>
                {ctasAtivos
                  .filter((c) => c.grupo === grupo)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.texto}>
                      {c.texto}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ))}
            {ctaForaDoCadastro ? (
              <SelectGroup>
                <SelectLabel>Fora do cadastro</SelectLabel>
                <SelectItem value={frame.cta}>{frame.cta}</SelectItem>
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      <SlotCompartilhado slot="cta_link" frameId={frame.id}>
        {frame.cta ? (
          <div className="space-y-1" {...stopDrag}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Link</span>
              <Salvo visivel={linkSalvo} />
            </div>
            <Select
              value={frame.cta_link}
              disabled={!editable}
              onValueChange={async (v) => {
                if (v === frame.cta_link) return;
                await onSaveFrame(frame.id, { cta_link: v });
                setLinkSalvo(true);
                setTimeout(() => setLinkSalvo(false), 2000);
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-8 text-sm",
                  linkFaltando && "border-warning focus-visible:ring-warning",
                )}
              >
                <SelectValue placeholder="Escolha o link" />
              </SelectTrigger>
              <SelectContent>
                {linksAtivos.map((l) => (
                  <SelectItem key={l.id} value={l.url}>
                    {l.nome}
                  </SelectItem>
                ))}
                {linkForaDoCadastro ? (
                  <SelectItem value={frame.cta_link}>{frame.cta_link}</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            {linkFaltando ? (
              <p className="text-[10px] font-medium text-warning-foreground">
                Escolha o link antes de aprovar
              </p>
            ) : null}
          </div>
        ) : null}
      </SlotCompartilhado>

      <SlotCompartilhado slot="adjust_comment" frameId={frame.id}>
        {frame.adjust_comment ? (
          <div className="rounded-lg bg-warning/20 p-2 text-xs">
            <p className="whitespace-pre-wrap">{frame.adjust_comment}</p>
            {frame.adjust_comment_at ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(frame.adjust_comment_at).toLocaleString("pt-BR")}
              </p>
            ) : null}
          </div>
        ) : null}
      </SlotCompartilhado>

      {editable ? (
        ajusteAberto ? (
          <div className="space-y-2" {...stopDrag}>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="O que precisa ser ajustado?"
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={comentario.trim().length === 0}
                onClick={() => {
                  onAdjustFrame(frame.id, comentario.trim());
                  setComentario("");
                  setAjusteAberto(false);
                }}
              >
                Confirmar ajuste
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAjusteAberto(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {canApprove ? (
              <>
                <Button
                  size="sm"
                  variant={frame.status === "aprovado" ? "secondary" : "default"}
                  className="flex-1 px-0"
                  title="Aprovar"
                  aria-label="Aprovar arte"
                  onClick={() => {
                    if (precisaLink(frame)) {
                      toast.error("Escolha o link do CTA antes de aprovar");
                      return;
                    }
                    onApproveFrame(frame.id);
                  }}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 px-0"
                  title="Pedir ajuste"
                  aria-label="Pedir ajuste na arte"
                  onClick={() => setAjusteAberto(true)}
                >
                  <MessageSquare className="size-4" />
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 px-0"
              title="Trocar imagem"
              aria-label="Trocar imagem da arte"
              onClick={() => trocaRef.current?.click()}
            >
              <ImageUp className="size-4" />
            </Button>
            <input
              ref={trocaRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (!ehImagemAceita(file)) {
                  toast.error("Arquivo não é uma imagem. Use jpg, jpeg, png ou webp.");
                  return;
                }
                onReplaceImage(frame, file);
              }}
            />
          </div>
        )
      ) : null}
    </div>
  );
}

export function StoryCard({
  story,
  editable,
  canApprove,
  showSlot,
  grupoAlturas = "principal",
  objetivos,
  onDelete,
  onAddFrames,
  onSaveBloco,
  onSaveFrame,
  onSaveComp,
  onApproveFrame,
  onApproveStory,
  onAdjustFrame,
  onReplaceImage,
  onSetObjective,
  onReplicarBloco,
  onReplicarProximo,
}: {
  story: Story;
  editable: boolean;
  canApprove: boolean;
  showSlot?: boolean;
  /** Separa listas independentes para que uma não influencie a altura da outra. */
  grupoAlturas?: string;
  /** Objetivos ativos disponíveis para escolha. */
  objetivos: { id: string; nome: string }[];
  onDelete: () => void;
  onAddFrames: (files: File[]) => void;
  onSaveBloco: (storyId: string, nome: string) => Promise<void>;
  onSaveFrame: (frameId: string, values: Partial<FrameType>) => Promise<void>;
  onSaveComp: (frameId: string, patch: Partial<Composicao>) => void;
  onApproveFrame: (frameId: string) => void;
  onApproveStory: () => void;
  onAdjustFrame: (frameId: string, comment: string) => void;
  onReplaceImage: (frame: FrameType, file: File) => void;
  onSetObjective: (storyId: string, objectiveId: string | null) => void;
  /** Replica a formatação de fonte da arte 1 em todas as artes do bloco. */
  onReplicarBloco?: () => void;
  /** Aplica a formatação de fonte da arte 1 em todas as artes do próximo bloco. */
  onReplicarProximo?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  // Blocos que caem na mesma linha visual ficam alinhados pelo topo e têm a mesma
  // posição vertical. Essa posição identifica a linha para o cálculo de alturas.
  const [topoLinha, setTopoLinha] = useState(0);
  useLayoutEffect(() => {
    const medido = Math.round(raizRef.current?.offsetTop ?? 0);
    setTopoLinha((atual) => (atual === medido ? atual : medido));
  });
  const [nomeBloco, setNomeBloco] = useState(story.nome_bloco);
  const [blocoSalvo, setBlocoSalvo] = useState(false);
  const [exportandoBloco, setExportandoBloco] = useState(false);
  const { data: logos = [] } = useQuery(logosQueryOptions);

  useEffect(() => setNomeBloco(story.nome_bloco), [story.nome_bloco]);

  const draggable = useDraggable({
    id: `story:${story.id}`,
    data: { type: "story", storyId: story.id },
    disabled: !editable,
  });
  const droppable = useDroppable({
    id: `card:${story.id}`,
    data: { type: "card", storyId: story.id },
  });
  const slot = useDroppable({
    id: `storyslot:${story.id}`,
    data: { type: "storyslot", storyId: story.id },
  });

  const full = story.frames.length >= MAX_FRAMES;
  const campanha = blocoTipo(story) === "CAMPANHA";
  const titulo = campanha
    ? story.nome_bloco || "Sem nome do story"
    : story.frames[0]?.nome_arquivo || "Sem nome";

  const total = story.frames.length;
  const aprovadas = story.frames.filter((f) => f.status === "aprovado").length;
  const emAjuste = story.frames.filter((f) => f.status === "ajustar").length;
  const tudoAprovado = total > 0 && aprovadas === total;
  const objetivoAtual = objetivos.find((o) => o.id === story.objective_id) ?? null;

  return (
    <div ref={raizRef} className="relative w-fit max-w-full">
      <LinhaAlturasProvider linha={`${grupoAlturas}:${topoLinha}`}>
      {showSlot ? (
        <div
          ref={slot.setNodeRef}
          className={cn(
            "absolute -left-3 top-0 z-20 h-full w-6 rounded-full transition-colors",
            slot.isOver ? "bg-primary" : "bg-primary/20",
          )}
          aria-label="Mover para antes deste story"
        />
      ) : null}
      <div
        ref={droppable.setNodeRef}
        className={cn(
          "flex flex-col gap-3 rounded-xl border-2 bg-card p-3 shadow-soft transition-shadow",
          STATUS_BORDER[story.status],
          droppable.isOver && "ring-2 ring-primary ring-offset-2",
          draggable.isDragging && "opacity-50",
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            ref={draggable.setNodeRef}
            {...draggable.attributes}
            {...draggable.listeners}
            className={cn(
              "touch-none rounded-md p-1 text-muted-foreground",
              editable ? "cursor-grab hover:bg-secondary" : "cursor-not-allowed opacity-40",
            )}
            aria-label="Arrastar story"
          >
            <GripVertical className="size-4" />
          </button>

          <span className="tabular shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {story.position}
          </span>

          {editable ? (
            <div className="flex min-w-0 flex-1 items-center gap-2" {...stopDrag}>
              <Input
                value={nomeBloco}
                placeholder={titulo}
                className="h-8 min-w-0 flex-1 text-sm font-semibold"
                aria-label="Nome do story"
                onChange={(e) => setNomeBloco(e.target.value)}
                onBlur={async () => {
                  if (nomeBloco === story.nome_bloco) return;
                  await onSaveBloco(story.id, nomeBloco);
                  setBlocoSalvo(true);
                  setTimeout(() => setBlocoSalvo(false), 2000);
                }}
              />
              <Salvo visivel={blocoSalvo} />
            </div>
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={titulo}>
              {titulo}
            </span>
          )}

          {editable && total > 1 && onReplicarBloco ? (
            <Button
              size="icon"
              variant="outline"
              className="size-8 shrink-0"
              title="Aplicar a formatação da arte 1 em todas as artes deste bloco"
              aria-label="Replicar formatação da arte 1 para todo o bloco"
              onClick={onReplicarBloco}
              {...stopDrag}
            >
              <Copy className="size-3.5" />
            </Button>
          ) : null}

          {editable && total > 0 && onReplicarProximo ? (
            <Button
              size="icon"
              variant="outline"
              className="size-8 shrink-0"
              title="Aplicar a formatação da arte 1 em todas as artes do próximo bloco"
              aria-label="Aplicar formatação da arte 1 no próximo bloco"
              onClick={onReplicarProximo}
              {...stopDrag}
            >
              <ArrowRight className="size-3.5" />
            </Button>
          ) : null}

          {canApprove && total > 0 && !tudoAprovado ? (
            <Button size="sm" className="shrink-0 gap-1" onClick={onApproveStory} {...stopDrag}>
              <CheckCheck className="size-3.5" /> Aprovar stories
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border bg-secondary px-2 py-0.5">
            {campanha ? `CAMPANHA • ${total} artes` : "SOLO"}
          </span>
          {tudoAprovado ? (
            <span className="rounded-full border border-success bg-success px-2 py-0.5 text-[11px] font-medium text-background">
              Aprovado
            </span>
          ) : (
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5">
              {aprovadas} de {total} aprovadas
            </span>
          )}
          {emAjuste > 0 ? (
            <span className="rounded-full border border-warning bg-warning/25 px-2 py-0.5 font-medium text-foreground">
              {emAjuste} em ajuste
            </span>
          ) : null}
          {canApprove ? (
            <span {...stopDrag}>
              <Select
                value={story.objective_id ?? "__nenhum__"}
                onValueChange={(v) => onSetObjective(story.id, v === "__nenhum__" ? null : v)}
              >
                <SelectTrigger
                  className="h-7 w-auto gap-1 rounded-full px-2 text-[11px]"
                  aria-label="Objetivo do story"
                >
                  <SelectValue placeholder="Sem objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhum__">Sem objetivo</SelectItem>
                  {objetivos.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          ) : objetivoAtual ? (
            <span className="rounded-full border border-primary/40 bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
              {objetivoAtual.nome}
            </span>
          ) : null}
        </div>

        <div className="flex flex-nowrap gap-3 overflow-x-auto">
          {story.frames.map((frame, index) => (
            <ArteBloco
              key={frame.id}
              frame={frame}
              index={index}
              total={total}
              editable={editable}
              canApprove={canApprove}
              onSaveFrame={onSaveFrame}
              onSaveComp={onSaveComp}
              onApproveFrame={onApproveFrame}
              onAdjustFrame={onAdjustFrame}
              onReplaceImage={onReplaceImage}
            />
          ))}
        </div>

        {aprovadas > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={exportandoBloco}
            onClick={async () => {
              setExportandoBloco(true);
              try {
                const n = await exportarBlocoMontado(
                  story,
                  (logoId) => logos.find((l) => l.id === logoId)?.svg ?? null,
                );
                toast.success(`${n} arte(s) exportada(s)`);
              } catch (erro) {
                toast.error(erro instanceof Error ? erro.message : "Falha ao exportar as artes");
              } finally {
                setExportandoBloco(false);
              }
            }}
          >
            <ImageUp className="size-4" /> Exportar artes aprovadas
          </Button>
        ) : null}

        {editable ? (
          <div className="flex items-center gap-1.5">
            {!full ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => inputRef.current?.click()}
              >
                <Plus className="size-4" /> Adicionar arte
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={onDelete}
              aria-label="Apagar story"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const todos = Array.from(e.target.files ?? []);
            const files = todos.filter(ehImagemAceita);
            if (files.length < todos.length) {
              toast.error("Alguns arquivos não são imagens. Use jpg, jpeg, png ou webp.");
            }
            if (files.length > 0) onAddFrames(files);
            e.target.value = "";
          }}
        />
      </div>
      </LinhaAlturasProvider>
    </div>
  );
}
