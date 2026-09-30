import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { GradeMes } from "@/components/meudia/GradeMes";
import { Diario } from "@/components/meudia/Diario";
import { DialogItem } from "@/components/meudia/DialogItem";
import { profileQueryOptions } from "@/lib/auth";
import {
  NOMES_MES, atualizarItem, contagemDoMes, criarItem, diarioQueryOptions,
  excluirItem, feriadosQueryOptions, gravarDiario, iso, itensQueryOptions,
  livresApartirDe, recorrentesQueryOptions, semanasDoMes,
  type ItemDia,
} from "@/lib/meudia";

export const Route = createFileRoute("/_authenticated/tarefas/meu-dia")({
  head: () => ({
    meta: [
      { title: "Meu dia — Marketing Juff" },
      { name: "description", content: "Planejamento pessoal por blocos, mês a mês." },
      { property: "og:title", content: "Meu dia — Marketing Juff" },
      { property: "og:description", content: "Planejamento pessoal por blocos, mês a mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeuDiaPage,
});

function MeuDiaPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const qc = useQueryClient();
  const hoje = new Date();
  const hojeIso = iso(hoje);

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [alvo, setAlvo] = useState<{ data: string; bloco: number } | null>(null);

  const mes2 = mes === 12 ? 1 : mes + 1;
  const ano2 = mes === 12 ? ano + 1 : ano;

  const semanas1 = semanasDoMes(ano, mes);
  const semanas2 = semanasDoMes(ano2, mes2);
  const de = semanas1[0][0];
  const ate = semanas2[semanas2.length - 1][4];

  const { data: itens = [] } = useQuery(itensQueryOptions(de, ate));
  const { data: feriados = {} } = useQuery(feriadosQueryOptions);
  const { data: relatos = {} } = useQuery(diarioQueryOptions(de, ate));
  const { data: recorrentes = [] } = useQuery(recorrentesQueryOptions);

  const chaveItens = ["meudia", "itens", de, ate] as const;
  const chaveDiario = ["meudia", "diario", de, ate] as const;

  function otimistaItens(muda: (l: ItemDia[]) => ItemDia[], gravar: () => Promise<unknown>) {
    const antes = qc.getQueryData<ItemDia[]>(chaveItens);
    qc.setQueryData<ItemDia[]>(chaveItens, muda(antes ?? []));
    gravar()
      .then(() => void qc.invalidateQueries({ queryKey: chaveItens }))
      .catch(() => {
        qc.setQueryData(chaveItens, antes);
        toast.error("Não deu para salvar");
      });
  }

  const contagem = contagemDoMes(itens, ano, mes);
  const pendentes = recorrentes
    .filter((r) => r.ativo && (contagem[r.id] ?? 0) < r.vezes_mes)
    .map((r) => `${r.descricao} ${contagem[r.id] ?? 0} de ${r.vezes_mes}`);

  const diasDoDiario = [...semanas1, ...semanas2]
    .flat()
    .filter((d) => d <= hojeIso)
    .slice(-20);

  return (
    <AppShell largura="ampla">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Mês anterior"
            onClick={() => {
              const m = mes === 1 ? 12 : mes - 1;
              setAno(mes === 1 ? ano - 1 : ano);
              setMes(m);
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-base font-semibold">
            {NOMES_MES[mes - 1]} e {NOMES_MES[mes2 - 1]}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Próximo mês"
            onClick={() => {
              const m = mes === 12 ? 1 : mes + 1;
              setAno(mes === 12 ? ano + 1 : ano);
              setMes(m);
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => {
              setAno(hoje.getFullYear());
              setMes(hoje.getMonth() + 1);
            }}
          >
            Hoje
          </Button>
        </div>

        {pendentes.length > 0 ? (
          <p className="rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
            Ainda falta encaixar em {NOMES_MES[mes - 1]}. {pendentes.join(" · ")}
          </p>
        ) : null}

        <GradeMes
          ano={ano}
          mes={mes}
          itens={itens}
          feriados={feriados}
          hojeIso={hojeIso}
          onAbrirBloco={(data, bloco) => setAlvo({ data, bloco })}
          onAlternarFeito={(i) =>
            otimistaItens(
              (l) => l.map((x) => (x.id === i.id ? { ...x, feito: !x.feito } : x)),
              () => atualizarItem(i.id, { feito: !i.feito }),
            )
          }
          onExcluir={(i) =>
            otimistaItens((l) => l.filter((x) => x.id !== i.id), () => excluirItem(i.id))
          }
        />

        <GradeMes
          ano={ano2}
          mes={mes2}
          itens={itens}
          feriados={feriados}
          hojeIso={hojeIso}
          onAbrirBloco={(data, bloco) => setAlvo({ data, bloco })}
          onAlternarFeito={(i) =>
            otimistaItens(
              (l) => l.map((x) => (x.id === i.id ? { ...x, feito: !x.feito } : x)),
              () => atualizarItem(i.id, { feito: !i.feito }),
            )
          }
          onExcluir={(i) =>
            otimistaItens((l) => l.filter((x) => x.id !== i.id), () => excluirItem(i.id))
          }
        />

        <Diario
          dias={diasDoDiario}
          relatos={relatos}
          onGravar={(data, modo, texto) => {
            const antes = qc.getQueryData<Record<string, typeof relatos[string]>>(chaveDiario);
            qc.setQueryData(chaveDiario, { ...(antes ?? {}), [data]: { data, modo, texto } });
            gravarDiario(data, modo, texto)
              .then(() => void qc.invalidateQueries({ queryKey: chaveDiario }))
              .catch(() => {
                qc.setQueryData(chaveDiario, antes);
                toast.error("Não deu para salvar o relato");
              });
          }}
        />
      </div>

      <DialogItem
        open={!!alvo}
        onOpenChange={(v) => !v && setAlvo(null)}
        dataIso={alvo?.data ?? ""}
        bloco={alvo?.bloco ?? 1}
        livres={alvo ? livresApartirDe(itens, alvo.data, alvo.bloco) : 1}
        userId={profile?.id ?? ""}
        onConfirmar={(dados) => {
          if (!alvo) return;
          const provisorio: ItemDia = {
            id: `tmp-${Date.now()}`,
            data: alvo.data,
            bloco_inicio: alvo.bloco,
            blocos: dados.blocos,
            texto: dados.texto,
            card_id: dados.card_id,
            recorrente_id: dados.recorrente_id,
            feito: false,
          };
          otimistaItens(
            (l) => [...l, provisorio],
            () =>
              criarItem({
                data: alvo.data,
                bloco_inicio: alvo.bloco,
                blocos: dados.blocos,
                texto: dados.texto,
                card_id: dados.card_id,
                recorrente_id: dados.recorrente_id,
              }),
          );
          setAlvo(null);
        }}
      />
    </AppShell>
  );
}
