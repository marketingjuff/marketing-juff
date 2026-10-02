import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { pessoasQueryOptions } from "@/lib/tarefas";
import { cardsVivosQueryOptions, type DecisaoEstrategia } from "@/lib/estrategia";
import { DialogVirarCard } from "@/components/estrategia/DialogVirarCard";

const NINGUEM = "__ninguem__";

export function ListaDecisoes({
  decisoes,
  editavel,
  contexto,
  onCriar,
  onAtualizar,
  onExcluir,
  onVirouCard,
}: {
  decisoes: DecisaoEstrategia[];
  editavel: boolean;
  contexto: string;
  onCriar: (texto: string) => void;
  onAtualizar: (id: string, patch: Partial<DecisaoEstrategia>) => void;
  onExcluir: (id: string) => void;
  onVirouCard: (decisaoId: string, cardId: string) => void;
}) {
  const [novo, setNovo] = useState("");
  const [alvo, setAlvo] = useState<DecisaoEstrategia | null>(null);
  const { data: pessoas = [] } = useQuery(pessoasQueryOptions);

  const ids = decisoes.map((d) => d.card_id).filter((v): v is string => !!v);
  const { data: vivos = {} } = useQuery(cardsVivosQueryOptions(ids));

  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Decisões da reunião
      </p>

      {decisoes.length === 0 ? (
        <p className="pb-2 text-sm text-muted-foreground">Nenhuma decisão registrada neste mês.</p>
      ) : null}

      <ul className="divide-y divide-border">
        {decisoes.map((d) => {
          const card = d.card_id ? vivos[d.card_id] : undefined;
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
              <Input
                defaultValue={d.texto}
                disabled={!editavel}
                className="h-8 min-w-[12rem] flex-1 border-transparent bg-transparent px-1 text-sm hover:border-border focus:border-border"
                onBlur={(e) => {
                  if (e.target.value !== d.texto) onAtualizar(d.id, { texto: e.target.value });
                }}
              />
              <Select
                value={d.responsavel_id ?? NINGUEM}
                disabled={!editavel}
                onValueChange={(v) => onAtualizar(d.id, { responsavel_id: v === NINGUEM ? null : v })}
              >
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NINGUEM}>Sem responsável</SelectItem>
                  {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={d.prazo ?? ""}
                disabled={!editavel}
                className="h-8 w-36 text-xs"
                onChange={(e) => onAtualizar(d.id, { prazo: e.target.value || null })}
              />

              {card ? (
                <Link
                  to="/tarefas/quadros/$quadroId"
                  params={{ quadroId: card.quadro_id }}
                  search={{ card: undefined }}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" /> Card criado
                </Link>
              ) : editavel ? (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setAlvo(d)}>
                  <Plus className="size-3.5" /> Virar card
                </Button>
              ) : null}

              {editavel ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  aria-label="Excluir decisão"
                  onClick={() => onExcluir(d.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {editavel ? (
        <form
          className="flex gap-2 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const t = novo.trim();
            if (!t) return;
            onCriar(t);
            setNovo("");
          }}
        >
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="Escreva uma decisão e aperte Enter"
            className="h-8 text-sm"
          />
          <Button type="submit" variant="outline" size="sm" className="h-8">Adicionar</Button>
        </form>
      ) : null}

      <DialogVirarCard
        decisao={alvo}
        open={!!alvo}
        onOpenChange={(v) => !v && setAlvo(null)}
        contexto={contexto}
        onCriado={(cardId) => {
          if (alvo) onVirouCard(alvo.id, cardId);
          toast.message("A decisão agora aponta para o card");
        }}
      />
    </div>
  );
}
