import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  TIPOS_NOTIFICACAO,
  preferenciasQueryOptions,
  salvarPreferencia,
  type TipoNotificacao,
} from "@/lib/notificacoes";

export function PainelNotificacoes() {
  const qc = useQueryClient();
  const { data: prefs = {} } = useQuery(preferenciasQueryOptions);
  const chave = ["notificacoes", "preferencias"] as const;

  function alternar(tipo: TipoNotificacao, ativo: boolean) {
    const antes = qc.getQueryData<Record<string, boolean>>(chave);
    qc.setQueryData<Record<string, boolean>>(chave, (p) => ({ ...(p ?? {}), [tipo]: ativo }));
    salvarPreferencia(tipo, ativo).catch(() => {
      qc.setQueryData(chave, antes);
      toast.error("Não deu para salvar");
    });
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {TIPOS_NOTIFICACAO.map((t) => (
          <li key={t.valor} className="flex items-center justify-between gap-4 p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.descricao}</p>
            </div>
            <Switch
              checked={prefs[t.valor] ?? true}
              onCheckedChange={(v) => alternar(t.valor, v)}
              aria-label={t.label}
            />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Estas opções valem apenas para você. Cada pessoa escolhe o que quer receber.
        Lembrete é verificado a cada quinze minutos. Vence amanhã, atrasado e parado são
        calculados uma vez por dia, de madrugada.
      </p>
    </div>
  );
}
