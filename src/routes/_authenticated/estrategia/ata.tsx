import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CampoAta } from "@/components/estrategia/CampoAta";
import { ListaDecisoes } from "@/components/estrategia/ListaDecisoes";
import { PanoramaAno } from "@/components/estrategia/PanoramaAno";
import { canEdit, hasPermission, profileQueryOptions } from "@/lib/auth";
import {
  FRENTES, MESES, ataQueryOptions, atualizarDecisao, camposQueryOptions, criarDecisao,
  excluirDecisao, frenteSalva, gravarAnotacoes, gravarValor, panoramaQueryOptions,
  salvarFrente, type AtaMensal, type DecisaoEstrategia, type Frente,
} from "@/lib/estrategia";

export const Route = createFileRoute("/_authenticated/estrategia/ata")({
  head: () => ({
    meta: [
      { title: "Ata mensal — Marketing Juff" },
      { name: "description", content: "Decisões do mês da Juff Store e da Juff Custom." },
      { property: "og:title", content: "Ata mensal — Marketing Juff" },
      { property: "og:description", content: "Decisões do mês da Juff Store e da Juff Custom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AtaPage,
});

function AtaPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "estrategia.ata");
  const gestao = profile?.role === "admin" || profile?.role === "gestor";
  const editavel = canEdit(profile, "estrategia.ata") && gestao;
  const qc = useQueryClient();

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [frente, setFrente] = useState<Frente>(frenteSalva());
  const [panorama, setPanorama] = useState(false);

  const { data: campos = [] } = useQuery({ ...camposQueryOptions(frente), enabled: pode });
  const { data: ata } = useQuery({ ...ataQueryOptions(frente, ano, mes), enabled: pode });
  const { data: meses = [] } = useQuery({ ...panoramaQueryOptions(frente, ano), enabled: pode && panorama });

  if (!pode) {
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem acesso à Estratégia.
        </p>
      </AppShell>
    );
  }

  const chaveAta = ["estrategia", "ata", frente, ano, mes] as const;
  const chavePanorama = ["estrategia", "panorama", frente, ano] as const;
  const ativos = campos.filter((c) => c.ativo);
  const contexto = `${MESES[mes - 1]} de ${ano}, ${FRENTES.find((f) => f.valor === frente)?.label}`;

  function invalidar() {
    void qc.invalidateQueries({ queryKey: chaveAta });
    void qc.invalidateQueries({ queryKey: chavePanorama });
  }

  /** Aplica na tela primeiro, grava depois, desfaz se der erro. */
  function otimista(muda: (a: AtaMensal) => AtaMensal, gravar: () => Promise<unknown>) {
    const antes = qc.getQueryData<AtaMensal | null>(chaveAta);
    const base: AtaMensal =
      antes ?? { id: "", frente, ano, mes, anotacoes: "", valores: {}, decisoes: [] };
    qc.setQueryData(chaveAta, muda(base));
    gravar()
      .then(() => invalidar())
      .catch(() => {
        qc.setQueryData(chaveAta, antes);
        toast.error("Não deu para salvar, o valor voltou");
      });
  }

  function andarMes(passo: number) {
    let m = mes + passo;
    let a = ano;
    if (m < 1) { m = 12; a -= 1; }
    if (m > 12) { m = 1; a += 1; }
    setMes(m);
    setAno(a);
  }

  return (
    <AppShell largura="ampla">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" aria-label="Mês anterior" onClick={() => andarMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-base font-semibold" onClick={() => setPanorama((v) => !v)}>
            {MESES[mes - 1]} {ano} <ChevronDown className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" aria-label="Próximo mês" onClick={() => andarMes(1)}>
            <ChevronRight className="size-4" />
          </Button>

          <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
            {FRENTES.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => { setFrente(f.valor); salvarFrente(f.valor); }}
                className={
                  "px-3 py-1.5 text-xs font-medium transition-colors " +
                  (frente === f.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {panorama ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-8" aria-label="Ano anterior" onClick={() => setAno((a) => a - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-medium">{ano}</span>
              <Button variant="outline" size="icon" className="size-8" aria-label="Próximo ano" onClick={() => setAno((a) => a + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <PanoramaAno
              ano={ano}
              meses={meses}
              campos={campos}
              mesAtual={ano === hoje.getFullYear() ? hoje.getMonth() + 1 : null}
              onAbrir={(m) => { setMes(m); setPanorama(false); }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ativos.map((c) => (
                <CampoAta
                  key={c.id}
                  label={c.label}
                  icone={c.icone}
                  valor={ata?.valores[c.id] ?? ""}
                  editavel={editavel}
                  onSalvar={(novo) =>
                    otimista(
                      (a) => ({ ...a, valores: { ...a.valores, [c.id]: novo } }),
                      () => gravarValor(frente, ano, mes, c.id, novo),
                    )
                  }
                />
              ))}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Anotações</p>
              <Textarea
                defaultValue={ata?.anotacoes ?? ""}
                rows={3}
                disabled={!editavel}
                className="text-sm"
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (ata?.anotacoes ?? "")) {
                    otimista((a) => ({ ...a, anotacoes: v }), () => gravarAnotacoes(frente, ano, mes, v));
                  }
                }}
              />
            </div>

            <div className="mt-4">
              <ListaDecisoes
                decisoes={ata?.decisoes ?? []}
                editavel={editavel}
                contexto={contexto}
                onCriar={(texto) => {
                  const posicao = (ata?.decisoes.length ?? 0) + 1;
                  const provisoria: DecisaoEstrategia = {
                    id: `tmp-${Date.now()}`, ata_id: ata?.id ?? "", texto,
                    responsavel_id: null, prazo: null, card_id: null, posicao,
                  };
                  otimista(
                    (a) => ({ ...a, decisoes: [...a.decisoes, provisoria] }),
                    () => criarDecisao(frente, ano, mes, texto, posicao),
                  );
                }}
                onAtualizar={(id, patch) =>
                  otimista(
                    (a) => ({ ...a, decisoes: a.decisoes.map((d) => (d.id === id ? { ...d, ...patch } : d)) }),
                    () => atualizarDecisao(id, patch),
                  )
                }
                onExcluir={(id) =>
                  otimista(
                    (a) => ({ ...a, decisoes: a.decisoes.filter((d) => d.id !== id) }),
                    () => excluirDecisao(id),
                  )
                }
                onVirouCard={(decisaoId, cardId) => {
                  qc.setQueryData<AtaMensal | null>(chaveAta, (a) =>
                    a ? { ...a, decisoes: a.decisoes.map((d) => (d.id === decisaoId ? { ...d, card_id: cardId } : d)) } : a,
                  );
                  invalidar();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
