import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  TIPOS_NOTIFICACAO,
  preferenciasQueryOptions,
  salvarPreferencia,
  type PrefCanais,
  type TipoNotificacao,
} from "@/lib/notificacoes";
import { desligarPush, estadoDoPush, ligarPush, type EstadoPush } from "@/lib/push";

export function PainelNotificacoes() {
  const qc = useQueryClient();
  const { data: prefs = {} } = useQuery(preferenciasQueryOptions);
  const chave = ["notificacoes", "preferencias"] as const;
  const [estado, setEstado] = useState<EstadoPush>("desligado");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    estadoDoPush().then(setEstado).catch(() => setEstado("nao_suportado"));
  }, []);

  function alternar(tipo: TipoNotificacao, canal: "sininho" | "push", valor: boolean) {
    const antes = qc.getQueryData<Record<string, PrefCanais>>(chave);
    qc.setQueryData<Record<string, PrefCanais>>(chave, (p) => ({
      ...(p ?? {}),
      [tipo]: { ...(p?.[tipo] ?? { sininho: true, push: false }), [canal]: valor },
    }));
    salvarPreferencia(tipo, canal, valor).catch(() => {
      qc.setQueryData(chave, antes);
      toast.error("Não deu para salvar");
    });
  }

  async function acao(fn: () => Promise<EstadoPush>) {
    setOcupado(true);
    try {
      setEstado(await fn());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const pushLigado = estado === "ligado";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <BellRing className="size-4 text-primary" /> Avisos no computador
        </p>

        {estado === "ligado" ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Ligado neste computador. Os avisos aparecem na tela mesmo com o sistema em segundo plano.
            </p>
            <Button size="sm" variant="outline" className="mt-2" disabled={ocupado} onClick={() => acao(desligarPush)}>
              Desativar neste computador
            </Button>
          </>
        ) : null}

        {estado === "desligado" ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Ainda não ativado neste computador. O navegador vai pedir sua autorização uma vez.
            </p>
            <Button size="sm" className="mt-2" disabled={ocupado} onClick={() => acao(ligarPush)}>
              Ativar avisos neste computador
            </Button>
          </>
        ) : null}

        {estado === "bloqueado" ? (
          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
            <p>Os avisos estão bloqueados por este navegador. Para liberar, faça assim.</p>
            <p>1. Clique no cadeado ao lado do endereço do site, no alto da tela.</p>
            <p>2. Procure Notificações na listinha que abrir.</p>
            <p>3. Troque de Bloquear para Permitir.</p>
            <p>4. Recarregue a página e volte aqui.</p>
          </div>
        ) : null}

        {estado === "abrir_aba" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Para ativar, abra o sistema numa aba própria do navegador (fora da janela de edição) e
            volte a esta tela.
          </p>
        ) : null}

        {estado === "nao_suportado" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Este navegador não aceita avisos no computador. No iPhone, isso só funciona depois de
            instalar o sistema na tela inicial.
          </p>
        ) : null}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        <li className="flex items-center justify-between gap-4 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Aviso</span>
          <span className="flex shrink-0 gap-6">
            <span className="w-12 text-center">Sininho</span>
            <span className="w-12 text-center">Push</span>
          </span>
        </li>
        {TIPOS_NOTIFICACAO.map((t) => {
          const p = prefs[t.valor] ?? { sininho: true, push: false };
          return (
            <li key={t.valor} className="flex items-center justify-between gap-4 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.descricao}</p>
              </div>
              <span className="flex shrink-0 gap-6">
                <span className="flex w-12 justify-center">
                  <Switch
                    checked={p.sininho}
                    onCheckedChange={(v) => alternar(t.valor, "sininho", v)}
                    aria-label={`${t.label} no sininho`}
                  />
                </span>
                <span className="flex w-12 justify-center">
                  <Switch
                    checked={p.push && pushLigado}
                    disabled={!pushLigado}
                    onCheckedChange={(v) => alternar(t.valor, "push", v)}
                    aria-label={`${t.label} no computador`}
                  />
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Estas opções valem apenas para você. O sininho guarda o histórico, o aviso no computador
        aparece e some. A autorização do computador é feita em cada máquina que você usar.
        Lembrete é verificado a cada quinze minutos. Vence amanhã e atrasado são
        calculados uma vez por dia, de madrugada.
      </p>
    </div>
  );
}
