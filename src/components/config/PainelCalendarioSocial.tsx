import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { estadoInstagramQueryOptions, formatosQueryOptions, type FormatoSocial } from "@/lib/calendario-social";

const K_FORMATOS = ["social", "formatos"] as const;
const K_ESTADO = ["social", "instagram", "estado"] as const;

export function PainelCalendarioSocial({ podeAlterar, ehAdmin }: { podeAlterar: boolean; ehAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: formatos = [] } = useQuery(formatosQueryOptions);
  const { data: estado } = useQuery({ ...estadoInstagramQueryOptions, enabled: ehAdmin });
  const [novo, setNovo] = useState("");
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [igId, setIgId] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  function otimista(muda: (l: FormatoSocial[]) => FormatoSocial[], gravar: () => PromiseLike<{ error: unknown }>) {
    const antes = qc.getQueryData<FormatoSocial[]>(K_FORMATOS) ?? [];
    qc.setQueryData(K_FORMATOS, muda(antes));
    Promise.resolve(gravar()).then(({ error }) => {
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: K_FORMATOS });
    }).catch(() => { qc.setQueryData(K_FORMATOS, antes); toast.error("Não deu para salvar"); });
  }

  function criar() {
    const nome = novo.trim();
    if (!nome) return;
    if (formatos.some((f) => f.nome.trim().toUpperCase() === nome.toUpperCase())) {
      toast.error("Esse formato já existe"); return;
    }
    setNovo("");
    const posicao = formatos.length + 1;
    otimista((l) => [...l, { id: `tmp-${Date.now()}`, nome, posicao, ativo: true }],
      () => supabase.from("social_formatos").insert({ nome, posicao }));
  }

  function soltar(alvo: string) {
    if (!arrastando || arrastando === alvo) return;
    const ids = formatos.map((f) => f.id);
    ids.splice(ids.indexOf(arrastando), 1);
    ids.splice(ids.indexOf(alvo), 0, arrastando);
    setArrastando(null);
    otimista(() => ids.map((id, i) => ({ ...formatos.find((f) => f.id === id)!, posicao: i + 1 })),
      () => supabase.rpc("social_formatos_reordenar", { _ids: ids }));
  }

  const igValor = igId ?? estado?.ig_user_id ?? "";
  const atrasada = estado?.ultima_leitura
    ? Date.now() - new Date(estado.ultima_leitura).getTime() > 3 * 3600_000
    : false;

  async function salvarIg() {
    const { error } = await supabase.from("social_instagram_estado").update({ ig_user_id: igValor.trim() }).eq("id", true);
    if (error) toast.error("Não deu para salvar o ID");
    else { toast.success("ID salvo"); void qc.invalidateQueries({ queryKey: K_ESTADO }); }
  }

  async function lerAgora() {
    setLendo(true);
    try {
      const { data: chave, error } = await supabase.rpc("social_sync_chave_admin");
      if (error || !chave) throw error ?? new Error("sem chave");
      await fetch("/api/public/social-instagram-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-social-chave": chave as string },
        body: "{}",
      });
      await qc.invalidateQueries({ queryKey: K_ESTADO });
      await qc.invalidateQueries({ queryKey: ["social", "publicados"] });
      toast.success("Leitura concluída");
    } catch {
      toast.error("Não deu para ler agora");
    } finally { setLendo(false); }
  }

  return (
    <div className="space-y-6 border-t border-border pt-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold">Formatos do calendário social</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {formatos.map((f) => (
            <li
              key={f.id}
              draggable={podeAlterar}
              onDragStart={() => setArrastando(f.id)}
              onDragEnd={() => setArrastando(null)}
              onDragOver={(e) => { if (arrastando) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); soltar(f.id); }}
              className={`flex items-center gap-2 p-2 ${arrastando === f.id ? "opacity-50" : ""}`}
            >
              {podeAlterar ? <GripVertical className="size-4 cursor-grab text-muted-foreground" /> : null}
              <Input
                defaultValue={f.nome}
                disabled={!podeAlterar}
                className="h-8 flex-1 text-sm"
                onBlur={(e) => {
                  const nome = e.target.value.trim();
                  if (!nome || nome === f.nome) return;
                  otimista((l) => l.map((x) => (x.id === f.id ? { ...x, nome } : x)),
                    () => supabase.from("social_formatos").update({ nome }).eq("id", f.id));
                }}
              />
              <Switch
                checked={f.ativo}
                disabled={!podeAlterar}
                onCheckedChange={(ativo) => otimista((l) => l.map((x) => (x.id === f.id ? { ...x, ativo } : x)),
                  () => supabase.from("social_formatos").update({ ativo }).eq("id", f.id))}
              />
            </li>
          ))}
        </ul>
        {podeAlterar ? (
          <div className="flex gap-2">
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo formato"
              className="h-8 text-sm" onKeyDown={(e) => { if (e.key === "Enter") criar(); }} />
            <Button size="sm" onClick={criar}><Plus className="mr-1 size-4" />Criar</Button>
          </div>
        ) : null}
      </div>

      {ehAdmin ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Ligação com o Instagram</p>
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <p>Conta: <strong>{estado?.nome_conta || "não ligada"}</strong></p>
            <p className="text-muted-foreground">
              Última leitura: {estado?.ultima_leitura ? new Date(estado.ultima_leitura).toLocaleString("pt-BR") : "nunca"}
            </p>
            {estado?.ultimo_erro ? <p className="text-destructive">Último erro: {estado.ultimo_erro}</p> : null}
            {atrasada ? <p className="text-destructive">A última leitura tem mais de três horas.</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Input value={igValor} onChange={(e) => setIgId(e.target.value)} placeholder="ID da conta do Instagram"
                className="h-8 max-w-xs text-sm" />
              <Button size="sm" variant="outline" onClick={salvarIg}>Salvar ID</Button>
              <Button size="sm" onClick={lerAgora} disabled={lendo}>{lendo ? "Lendo…" : "Testar e ler agora"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
