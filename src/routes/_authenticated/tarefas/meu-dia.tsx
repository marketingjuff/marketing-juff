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
import { DialogExcluirRecorrente } from "@/components/meudia/DialogExcluirRecorrente";
import { profileQueryOptions } from "@/lib/auth";
import {
  NOMES_MES, atualizarItem, contagemDoMes, criarExcecao, criarItem, diarioQueryOptions,
  encerrarRecorrente, excecoesQueryOptions, excluirItem, feriadosQueryOptions, gravarDiario,
  iso, itensQueryOptions, livresApartirDe, montarItens, recorrentesQueryOptions, semanasDoMes,
  type ItemDia, type RelatoDia,
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
  const [aTirar, setATirar] = useState<ItemDia | null>(null);

  const mes2 = mes === 12 ? 1 : mes + 1;
  const ano2 = mes === 12 ? ano + 1 : ano;

  const semanas1 = semanasDoMes(ano, mes);
  const semanas2 = semanasDoMes(ano2, mes2);
  const dias = [...new Set([...semanas1, ...semanas2].flat())];
  const de = dias[0] ?? "";
  const ate = dias[dias.length - 1] ?? "";

  const { data: gravados = [] } = useQuery(itensQueryOptions(de, ate));
  const { data: feriados = {} } = useQuery(feriadosQueryOptions);
  const { data: relatos = {} } = useQuery(diarioQueryOptions(de, ate));
  const { data: recorrentes = [] } = useQuery(recorrentesQueryOptions);
  const { data: excecoes = new Set<string>() } = useQuery(excecoesQueryOptions(de, ate));

  const chaveItens = ["meudia", "itens", de, ate] as const;
  const chaveExcecoes = ["meudia", "excecoes", de, ate] as const;
  const chaveDiario = ["meudia", "diario", de, ate] as const;
  const chaveRec = ["meudia", "recorrentes"] as const;

  const itens = montarItens({ dias, gravados, recorrentes, excecoes, feriados });

  function otimistaGravados(muda: (l: ItemDia[]) => ItemDia[], gravar: () => Promise<unknown>) {
    const antes = qc.getQueryData<ItemDia[]>(chaveItens);
    qc.setQueryData<ItemDia[]>(chaveItens, muda(antes ?? []));
    gravar()
      .then(() => void qc.invalidateQueries({ queryKey: chaveItens }))
      .catch(() => {
        qc.setQueryData(chaveItens, antes);
        toast.error("Não deu para salvar");
      });
  }

  /** Item automático só vira registro no banco quando a pessoa mexe nele. */
  function alternarFeito(item: ItemDia) {
    if (item.virtual) {
      const real: ItemDia = { ...item, feito: true, virtual: false, id: `tmp-${Date.now()}` };
      otimistaGravados(
        (l) => [...l, real],
        () =>
          criarItem({
            data: item.data,
            bloco_inicio: item.bloco_inicio,
            blocos: item.blocos,
            texto: item.texto,
            card_id: null,
            recorrente_id: item.recorrente_id,
            feito: true,
          }),
      );
      return;
    }
    otimistaGravados(
      (l) => l.map((x) => (x.id === item.id ? { ...x, feito: !x.feito } : x)),
      () => atualizarItem(item.id, { feito: !item.feito }),
    );
  }

  function pedirParaTirar(item: ItemDia) {
    if (item.recorrente_id) {
      setATirar(item);
      return;
    }
    otimistaGravados((l) => l.filter((x) => x.id !== item.id), () => excluirItem(item.id));
  }

  function tirarSoEsteDia(item: ItemDia) {
    const antes = qc.getQueryData<Set<string>>(chaveExcecoes);
    const novo = new Set(antes ?? []);
    novo.add(`${item.recorrente_id}|${item.data}`);
    qc.setQueryData(chaveExcecoes, novo);

    const tarefas: Promise<unknown>[] = [criarExcecao(item.recorrente_id as string, item.data)];
    if (!item.virtual) {
      qc.setQueryData<ItemDia[]>(chaveItens, (l) => (l ?? []).filter((x) => x.id !== item.id));
      tarefas.push(excluirItem(item.id));
    }

    Promise.all(tarefas)
      .then(() => {
        void qc.invalidateQueries({ queryKey: chaveExcecoes });
        void qc.invalidateQueries({ queryKey: chaveItens });
      })
      .catch(() => {
        qc.setQueryData(chaveExcecoes, antes);
        void qc.invalidateQueries({ queryKey: chaveItens });
        toast.error("Não deu para tirar");
      });
  }

  function tirarEsteEProximos(item: ItemDia) {
    encerrarRecorrente(item.recorrente_id as string, item.data)
      .then(() => {
        void qc.invalidateQueries({ queryKey: chaveRec });
        toast.success("Não vai mais aparecer daqui para frente");
      })
      .catch(() => toast.error("Não deu para encerrar"));
  }

  const contagem = contagemDoMes(itens, ano, mes);
  const pendentes = recorrentes
    .filter((r) => r.ativo && r.dia_semana === "livre" && (contagem[r.id] ?? 0) < r.vezes_mes)
    .map((r) => `${r.descricao} ${contagem[r.id] ?? 0} de ${r.vezes_mes}`);

  const diasDoDiario = dias.filter((d) => d <= hojeIso).slice(-20);

  const gradeProps = {
    itens,
    feriados,
    hojeIso,
    onAbrirBloco: (data: string, bloco: number) => setAlvo({ data, bloco }),
    onAlternarFeito: alternarFeito,
    onExcluir: pedirParaTirar,
  };

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

        <GradeMes ano={ano} mes={mes} {...gradeProps} />
        <GradeMes ano={ano2} mes={mes2} {...gradeProps} />

        <Diario
          dias={diasDoDiario}
          relatos={relatos}
          onGravar={(data, modo, texto) => {
            const antes = qc.getQueryData<Record<string, RelatoDia>>(chaveDiario);
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
          otimistaGravados(
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

      <DialogExcluirRecorrente
        open={!!aTirar}
        onOpenChange={(v) => !v && setATirar(null)}
        descricao={aTirar?.texto ?? ""}
        onSoEsteDia={() => aTirar && tirarSoEsteDia(aTirar)}
        onEsteEProximos={() => aTirar && tirarEsteEProximos(aTirar)}
      />
    </AppShell>
  );
}
