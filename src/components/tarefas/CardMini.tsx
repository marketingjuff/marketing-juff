import { CheckCircle2, RefreshCw, CheckSquare, MessageSquare, Paperclip, Pause, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIORIDADES,
  estaAdiado,
  estaAtrasado,
  formatarDataHora,
  ehRecorrente,
  siglaPessoa,
  venceAmanha,
  venceHoje,
  type Card,
  type Etiqueta,
  type Pessoa,
  coresDaEtiqueta,
} from "@/lib/tarefas";
import { useLayoutEffect, useRef, useState } from "react";

const ACHATAMENTO = 0.78;

export function EtiquetaCompacta({ nome, cor, corTexto }: { nome: string; cor: string; corTexto: string }) {
  const texto = useRef<HTMLSpanElement>(null);
  const [largura, setLargura] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = texto.current;
    if (!el) return;
    let ativo = true;
    const medir = () => {
      if (ativo) setLargura(Math.ceil(el.getBoundingClientRect().width) + 2);
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    void document.fonts.ready.then(medir);
    return () => {
      ativo = false;
      observer.disconnect();
    };
  }, [nome]);

  return (
    <span
      className="inline-flex max-w-full shrink items-center overflow-hidden rounded-[3px] px-1 py-px"
      style={{ backgroundColor: cor, color: corTexto }}
      title={nome}
    >
      <span
        className="block overflow-hidden"
        style={{ width: largura === null ? undefined : `${largura}px` }}
      >
        <span
          ref={texto}
           className="font-nunito block w-max whitespace-nowrap text-[11px] font-medium uppercase leading-[1.35]"
          style={{ transform: `scaleX(${ACHATAMENTO})`, transformOrigin: "left center" }}
        >
          {nome}
        </span>
      </span>
    </span>
  );
}

export function CardMini({
  card,
  etiquetas,
  pessoas,
  onClick,
  arrastando = false,
  exigeResponsavel = false,
}: {
  card: Card;
  etiquetas: Map<string, Etiqueta>;
  pessoas: Map<string, Pessoa>;
  onClick?: () => void;
  arrastando?: boolean;
  exigeResponsavel?: boolean;
}) {
  const atrasado = estaAtrasado(card);
  const breve = venceHoje(card) || venceAmanha(card);
  const adiado = estaAdiado(card);
  const prio = PRIORIDADES.find((p) => p.valor === card.prioridade);
  const resp = card.responsavel_id ? pessoas.get(card.responsavel_id) : undefined;
  const tags = card.etiquetas.map((id) => etiquetas.get(id)).filter(Boolean) as Etiqueta[];

  return (
    <button
      type="button"
      onClick={onClick}
      style={card.cor_fundo ? { backgroundColor: card.cor_fundo } : undefined}
      className={cn(
        "block w-full rounded-lg border border-border p-2 text-left shadow-soft transition-shadow hover:shadow-md",
        !card.cor_fundo && "bg-card",
        (adiado || card.concluido) && "opacity-60",
        arrastando && "rotate-1 shadow-lg",
      )}
    >
      {card.cor ? (
        <div className="-mx-2 -mt-2 mb-1.5 h-1.5 rounded-t-lg" style={{ backgroundColor: card.cor }} />
      ) : null}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {tags.length > 0 ? (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {tags.slice(0, 3).map((t) => (
                <EtiquetaCompacta key={t.id} nome={t.nome} cor={coresDaEtiqueta(t, pessoas).cor} corTexto={coresDaEtiqueta(t, pessoas).cor_texto} />
              ))}
              {tags.length > 3 ? (
                <span
                  className="font-nunito inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium leading-tight text-muted-foreground"
                  title={tags.slice(3).map((t) => t.nome).join(", ")}
                >
                  +{tags.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
          <p className="flex items-start gap-1 text-sm leading-snug">
            {card.concluido ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> : null}
            <span className="break-words">{card.titulo || "Sem título"}</span>
          </p>
        </div>
        <div className="flex w-[76px] shrink-0 flex-col items-end gap-1 text-[11px] text-muted-foreground">
          {resp ? (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none tracking-tight",
                !resp.cor_avatar && "bg-primary text-primary-foreground",
              )}
              style={
                resp.cor_avatar
                  ? { backgroundColor: resp.cor_avatar, color: resp.cor_texto_avatar ?? "#ffffff" }
                  : undefined
              }
              title={resp.nome}
            >
              {siglaPessoa(resp)}
            </span>
          ) : null}
          {exigeResponsavel && !card.responsavel_id ? (
            <span
              className="rounded border border-destructive px-1 py-px text-center text-[10px] font-medium leading-tight text-destructive"
              title="Escolha um responsável para poder mover este card"
            >
              sem resp.
            </span>
          ) : null}
          {prio || card.checklist_total > 0 || card.comentarios_total > 0 || card.anexos_total > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1">
              {prio ? (
                <span className="flex items-center" title={`Prioridade ${prio.label}`}>
                  <Flag className="size-3" style={{ color: prio.cor }} />
                </span>
              ) : null}
              {card.checklist_total > 0 ? (
                <span className="flex items-center gap-0.5">
                  <CheckSquare className="size-3" />
                  {card.checklist_feitos}/{card.checklist_total}
                </span>
              ) : null}
              {card.comentarios_total > 0 ? (
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="size-3" />
                  {card.comentarios_total}
                </span>
              ) : null}
              {card.anexos_total > 0 ? <Paperclip className="size-3" /> : null}
            </div>
          ) : null}
          {card.data_entrega ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 whitespace-nowrap rounded px-1",
                atrasado && "bg-destructive/15 font-medium text-destructive",
                !atrasado && breve && "bg-warning/25 font-medium text-foreground",
              )}
            >
              {ehRecorrente(card) ? <RefreshCw className="size-3 shrink-0" /> : null}
              {formatarDataHora(card.data_entrega, card.hora_entrega)}
            </span>
          ) : null}
          {adiado ? (
            <span className="flex items-center gap-0.5 whitespace-nowrap">
              <Pause className="size-3" /> até {formatarDataHora(card.adiado_ate, null)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
