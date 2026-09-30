import { useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { profileQueryOptions } from "@/lib/auth";
import {
  DIAS_SEMANA, atualizarRecorrente, criarFeriado, criarRecorrente, excluirFeriado,
  excluirRecorrente, feriadosQueryOptions, importarFeriados, recorrentesQueryOptions,
  type DiaSemana,
} from "@/lib/meudia";

export function PainelMeuDia() {
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const gestao = profile?.role === "admin" || profile?.role === "gestor";

  const { data: recorrentes = [] } = useQuery(recorrentesQueryOptions);
  const { data: feriados = {} } = useQuery(feriadosQueryOptions);

  const [novoRec, setNovoRec] = useState("");
  const [dataFer, setDataFer] = useState("");
  const [nomeFer, setNomeFer] = useState("");
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);

  const chaveRec = ["meudia", "recorrentes"] as const;
  const chaveFer = ["meudia", "feriados"] as const;

  const listaFeriados = Object.entries(feriados).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Meus recorrentes</h3>
          <p className="text-xs text-muted-foreground">
            O que se repete todo mês. Só você enxerga esta lista.
          </p>
          <p className="text-xs text-muted-foreground">
            Com dia da semana escolhido, o item entra sozinho na grade em todo dia correspondente,
            no bloco que a hora indicar. Marcado como livre, você encaixa na mão e o campo de vezes
            por mês serve para o sistema avisar quanto ainda falta.
          </p>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {recorrentes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 p-2">
              <Input
                defaultValue={r.descricao}
                className="h-8 min-w-[12rem] flex-1 text-sm"
                onBlur={async (e) => {
                  const v = e.target.value.trim();
                  if (!v || v === r.descricao) return;
                  try {
                    await atualizarRecorrente(r.id, { descricao: v });
                    void qc.invalidateQueries({ queryKey: chaveRec });
                  } catch { toast.error("Não deu para renomear"); }
                }}
              />
              {r.dia_semana === "livre" ? (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">vezes por mês</span>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={r.vezes_mes}
                  className="h-8 w-16 text-sm"
                  onBlur={async (e) => {
                    const v = Number(e.target.value) || 1;
                    if (v === r.vezes_mes) return;
                    try {
                      await atualizarRecorrente(r.id, { vezes_mes: v });
                      void qc.invalidateQueries({ queryKey: chaveRec });
                    } catch { toast.error("Não deu para salvar"); }
                  }}
                />
              </div>
              ) : null}
              <Select
                value={String(r.blocos)}
                onValueChange={async (v) => {
                  try {
                    await atualizarRecorrente(r.id, { blocos: Number(v) });
                    void qc.invalidateQueries({ queryKey: chaveRec });
                  } catch { toast.error("Não deu para salvar"); }
                }}
              >
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 4 ? "Dia inteiro" : `${n} bloco${n > 1 ? "s" : ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={r.dia_semana}
                onValueChange={async (v) => {
                  try {
                    await atualizarRecorrente(r.id, { dia_semana: v as DiaSemana });
                    void qc.invalidateQueries({ queryKey: chaveRec });
                  } catch { toast.error("Não deu para salvar"); }
                }}
              >
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((d) => (
                    <SelectItem key={d.valor} value={d.valor}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="time"
                defaultValue={r.hora ? r.hora.slice(0, 5) : ""}
                className="h-8 w-24 text-xs"
                onBlur={async (e) => {
                  const v = e.target.value || null;
                  try {
                    await atualizarRecorrente(r.id, { hora: v });
                    void qc.invalidateQueries({ queryKey: chaveRec });
                  } catch { toast.error("Não deu para salvar"); }
                }}
              />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch
                  checked={r.ativo}
                  onCheckedChange={async (v) => {
                    try {
                      await atualizarRecorrente(r.id, { ativo: v });
                      void qc.invalidateQueries({ queryKey: chaveRec });
                    } catch { toast.error("Não deu para salvar"); }
                  }}
                />
                Ativo
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label="Excluir recorrente"
                onClick={async () => {
                  try {
                    await excluirRecorrente(r.id);
                    void qc.invalidateQueries({ queryKey: chaveRec });
                  } catch { toast.error("Não deu para excluir"); }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>

        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = novoRec.trim();
            if (!v) return;
            setNovoRec("");
            try {
              await criarRecorrente(v, recorrentes.length + 1);
              void qc.invalidateQueries({ queryKey: chaveRec });
            } catch { toast.error("Não deu para criar"); }
          }}
        >
          <Input
            value={novoRec}
            onChange={(e) => setNovoRec(e.target.value)}
            placeholder="Nome do recorrente novo"
            className="h-8 text-sm"
          />
          <Button type="submit" variant="outline" size="sm" className="h-8 gap-1">
            <Plus className="size-4" /> Adicionar
          </Button>
        </form>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <div>
          <h3 className="text-sm font-semibold">Feriados e dias sem trabalho</h3>
          <p className="text-xs text-muted-foreground">
            Vale para toda a Juff. Dia que está aqui fica cinza e não aceita bloco.
            Use também para férias, emenda e decisão da diretoria.
          </p>
        </div>

        {gestao ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="h-8 w-24 text-sm"
              aria-label="Ano"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const n = await importarFeriados(Number(ano));
                  void qc.invalidateQueries({ queryKey: chaveFer });
                  toast.success(n === 0 ? "Já estava tudo cadastrado" : `${n} feriado${n > 1 ? "s" : ""} acrescentado${n > 1 ? "s" : ""}`);
                } catch {
                  toast.error("Não deu para buscar os feriados do ano");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Download className="size-4" /> Buscar feriados nacionais do ano
            </Button>
          </div>
        ) : null}

        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {listaFeriados.map(([data, descricao]) => (
            <li key={data} className="flex items-center gap-2 p-2">
              <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">
                {data.slice(8, 10)}/{data.slice(5, 7)}/{data.slice(0, 4)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{descricao}</span>
              {gestao ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  aria-label="Excluir feriado"
                  onClick={async () => {
                    try {
                      await excluirFeriado(data);
                      void qc.invalidateQueries({ queryKey: chaveFer });
                    } catch { toast.error("Não deu para excluir"); }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>

        {gestao ? (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!dataFer || !nomeFer.trim()) return;
              try {
                await criarFeriado(dataFer, nomeFer.trim());
                setDataFer("");
                setNomeFer("");
                void qc.invalidateQueries({ queryKey: chaveFer });
              } catch { toast.error("Essa data já está cadastrada"); }
            }}
          >
            <Input type="date" value={dataFer} onChange={(e) => setDataFer(e.target.value)} className="h-8 w-40 text-sm" />
            <Input
              value={nomeFer}
              onChange={(e) => setNomeFer(e.target.value)}
              placeholder="Férias, emenda, recesso"
              className="h-8 min-w-[12rem] flex-1 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" className="h-8 gap-1">
              <Plus className="size-4" /> Acrescentar
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
