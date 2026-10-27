import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { NovaEtiquetaForm } from "./NovaEtiquetaForm";
import { cn } from "@/lib/utils";
import { coresDaEtiqueta, siglaPessoa, type Etiqueta } from "@/lib/tarefas";

type PessoaDoTrilho = {
  id: string;
  nome: string | null;
  sigla: string | null;
  cor_avatar: string | null;
  cor_texto_avatar: string | null;
};

export function TrilhoEtiquetas({
  quadroId,
  cardId,
  etiquetasDoQuadro,
  etiquetasDoCard,
  todasEtiquetas,
  pessoas,
  responsavelId,
  membros,
  mostrarMembros,
  mexer,
  podeCriar,
  onToggle,
  onCriada,
}: {
  quadroId: string;
  cardId: string;
  etiquetasDoQuadro: Etiqueta[];
  etiquetasDoCard: string[];
  todasEtiquetas: Etiqueta[];
  pessoas: PessoaDoTrilho[];
  responsavelId: string | null;
  membros: string[];
  mostrarMembros: boolean;
  mexer: boolean;
  podeCriar: boolean;
  onToggle: (novas: string[]) => void;
  onCriada: (id: string) => Promise<void> | void;
}) {
  const porNome = (a: Etiqueta, b: Etiqueta) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
  const ligadas = etiquetasDoQuadro.filter((e) => etiquetasDoCard.includes(e.id)).sort(porNome);
  const desligadas = etiquetasDoQuadro.filter((e) => !etiquetasDoCard.includes(e.id)).sort(porNome);
  const pessoaDe = (id: string | null) => pessoas.find((p) => p.id === id);
  const membrosVisiveis = mostrarMembros ? membros.filter((id) => id !== responsavelId) : [];

  const pilula = (e: Etiqueta, on: boolean) => {
    const cs = coresDaEtiqueta(e, pessoas);
    return (
      <button
        key={e.id}
        type="button"
        disabled={!mexer}
        title={on ? `${e.nome}, clique para tirar` : `${e.nome}, clique para aplicar`}
        onClick={() => {
          const novas = on
            ? etiquetasDoCard.filter((x) => x !== e.id)
            : [...etiquetasDoCard, e.id];
          onToggle(novas);
        }}
        className={cn(
          "font-nunito rounded-[3px] text-[11px] font-medium uppercase leading-[1.3] transition-colors",
          on ? "px-[5px] py-[2px]" : "border px-[5px] py-[1px] text-muted-foreground hover:text-foreground",
          !mexer && "cursor-default",
        )}
        style={
          on
            ? { backgroundColor: cs.cor, color: cs.cor_texto }
            : { borderColor: cs.cor, backgroundColor: "transparent" }
        }
      >
        {e.nome}
      </button>
    );
  };

  return (
    <div className="flex items-start gap-2 px-2 pt-2">
      {responsavelId || membrosVisiveis.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1 pt-px">
          {responsavelId ? (
            <span
              className="flex size-5 items-center justify-center rounded-full text-[9px] font-semibold"
              style={{
                backgroundColor: pessoaDe(responsavelId)?.cor_avatar ?? "#378add",
                color: pessoaDe(responsavelId)?.cor_texto_avatar ?? "#ffffff",
              }}
              title={pessoaDe(responsavelId)?.nome ?? "Responsável"}
            >
              {siglaPessoa(pessoaDe(responsavelId) ?? { nome: "", sigla: null })}
            </span>
          ) : null}
          {membrosVisiveis.map((id) => (
            <span
              key={id}
              className="flex size-4 items-center justify-center rounded-full text-[8px] font-semibold opacity-70"
              style={{
                backgroundColor: pessoaDe(id)?.cor_avatar ?? "#888780",
                color: pessoaDe(id)?.cor_texto_avatar ?? "#ffffff",
              }}
              title={`${pessoaDe(id)?.nome ?? "Pessoa"}, membro`}
            >
              {siglaPessoa(pessoaDe(id) ?? { nome: "", sigla: null })}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {ligadas.map((e) => pilula(e, true))}
        {ligadas.length > 0 && desligadas.length > 0 ? (
          <span className="mx-[2px] h-3.5 w-px shrink-0 bg-border" />
        ) : null}
        {desligadas.map((e) => pilula(e, false))}
        {etiquetasDoQuadro.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">
            Nenhuma etiqueta para este quadro.
          </span>
        ) : null}
        {mexer && podeCriar ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Nova etiqueta"
                title="Nova etiqueta"
                className="flex size-[18px] items-center justify-center rounded-[3px] border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <Plus className="size-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <NovaEtiquetaForm
                key={cardId}
                quadroId={quadroId}
                etiquetas={todasEtiquetas}
                onCriada={onCriada}
              />
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}
