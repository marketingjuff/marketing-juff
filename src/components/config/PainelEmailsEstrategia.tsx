import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  atualizarRegraEmail, atualizarTipoEmail, criarRegraEmail, criarTipoEmail, excluirRegraEmail,
  normalizar, regrasEmailQueryOptions, reordenarRegrasEmail, reordenarTiposEmail, tiposEmailQueryOptions,
} from "@/lib/estrategia-emails";

const TODOS = "__todos__";

/** Arraste simples por HTML: devolve a nova ordem de ids. */
function useArraste<T extends { id: string }>(itens: T[], onOrdem: (ids: string[]) => void) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  return (id: string, ativo: boolean) => ({
    draggable: ativo,
    onDragStart: () => setArrastando(id),
    onDragEnd: () => setArrastando(null),
    onDragOver: (e: React.DragEvent) => { if (arrastando) e.preventDefault(); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (!arrastando || arrastando === id) return;
      const ids = itens.map((x) => x.id);
      const de = ids.indexOf(arrastando);
      const para = ids.indexOf(id);
      ids.splice(de, 1);
      ids.splice(para, 0, arrastando);
      setArrastando(null);
      onOrdem(ids);
    },
    className: arrastando === id ? "opacity-50" : "",
  });
}

export function PainelEmailsEstrategia({ podeAlterar }: { podeAlterar: boolean }) {
  const qc = useQueryClient();
  const { data: tipos = [] } = useQuery(tiposEmailQueryOptions());
  const { data: regras = [] } = useQuery(regrasEmailQueryOptions());
  const [novoTipo, setNovoTipo] = useState("");
  const kTipos = ["estrategia", "email-tipos"] as const;
  const kRegras = ["estrategia", "email-regras"] as const;

  function salvar(k: readonly string[], fn: () => Promise<unknown>, erro = "Não deu para salvar") {
    fn().then(() => void qc.invalidateQueries({ queryKey: k })).catch(() => {
      void qc.invalidateQueries({ queryKey: k });
      toast.error(erro);
    });
  }

  const arrTipos = useArraste(tipos, (ids) => {
    qc.setQueryData(kTipos, ids.map((id) => tipos.find((t) => t.id === id)!));
    salvar(kTipos, () => reordenarTiposEmail(ids), "Não deu para reordenar");
  });
  const arrRegras = useArraste(regras, (ids) => {
    qc.setQueryData(kRegras, ids.map((id) => regras.find((t) => t.id === id)!));
    salvar(kRegras, () => reordenarRegrasEmail(ids), "Não deu para reordenar");
  });

  function nomeRepetido(nome: string, id?: string) {
    return tipos.some((t) => t.id !== id && normalizar(t.nome) === normalizar(nome));
  }

  return (
    <div className="space-y-6 border-t border-border pt-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold">Tipos de e-mail</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {tipos.map((t) => {
            const a = arrTipos(t.id, podeAlterar);
            return (
              <li key={t.id} {...a} className={`flex items-center gap-2 p-2 ${a.className}`}>
                {podeAlterar ? <GripVertical className="size-4 cursor-grab text-muted-foreground" /> : null}
                <Input defaultValue={t.nome} disabled={!podeAlterar} className="h-8 flex-1 text-sm"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v || v === t.nome) { e.target.value = t.nome; return; }
                    if (nomeRepetido(v, t.id)) { e.target.value = t.nome; toast.error("Já existe um tipo com esse nome"); return; }
                    salvar(kTipos, () => atualizarTipoEmail(t.id, { nome: v }));
                  }} />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch checked={t.ativo} disabled={!podeAlterar}
                    onCheckedChange={(v) => salvar(kTipos, () => atualizarTipoEmail(t.id, { ativo: v }))} />
                  Ativo
                </label>
              </li>
            );
          })}
        </ul>
        {podeAlterar ? (
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const v = novoTipo.trim();
            if (!v) return;
            if (nomeRepetido(v)) { toast.error("Já existe um tipo com esse nome"); return; }
            setNovoTipo("");
            salvar(kTipos, () => criarTipoEmail(v, tipos.length + 1), "Não deu para criar o tipo");
          }}>
            <Input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} placeholder="Nome do tipo novo" className="h-8 text-sm" />
            <Button type="submit" variant="outline" size="sm" className="h-8 gap-1"><Plus className="size-4" /> Adicionar</Button>
          </form>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Tipo desativado some da escolha de novas linhas, mas continua nas linhas antigas que já o usam.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Regras de e-mail</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {regras.map((r) => {
            const a = arrRegras(r.id, podeAlterar);
            return (
              <li key={r.id} {...a} className={`space-y-2 p-2 ${a.className}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {podeAlterar ? <GripVertical className="size-4 cursor-grab text-muted-foreground" /> : null}
                  <Input defaultValue={r.titulo} disabled={!podeAlterar} placeholder="Título curto" className="h-8 min-w-[12rem] flex-1 text-sm"
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== r.titulo) salvar(kRegras, () => atualizarRegraEmail(r.id, { titulo: v })); }} />
                  <Select value={r.tipo_id ?? TODOS} disabled={!podeAlterar}
                    onValueChange={(v) => salvar(kRegras, () => atualizarRegraEmail(r.id, { tipo_id: v === TODOS ? null : v }))}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODOS}>Todos os tipos</SelectItem>
                      {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch checked={r.ativo} disabled={!podeAlterar}
                      onCheckedChange={(v) => salvar(kRegras, () => atualizarRegraEmail(r.id, { ativo: v }))} />
                    Ativo
                  </label>
                  {podeAlterar ? (
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Apagar regra"
                      onClick={() => { if (confirm("Apagar esta regra?")) salvar(kRegras, () => excluirRegraEmail(r.id)); }}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <Textarea defaultValue={r.texto} disabled={!podeAlterar} rows={3} className="text-sm" placeholder="Texto da regra"
                  onBlur={(e) => { if (e.target.value !== r.texto) salvar(kRegras, () => atualizarRegraEmail(r.id, { texto: e.target.value })); }} />
              </li>
            );
          })}
        </ul>
        {podeAlterar ? (
          <Button variant="outline" size="sm" className="h-8 gap-1"
            onClick={() => salvar(kRegras, () => criarRegraEmail(regras.length + 1), "Não deu para criar a regra")}>
            <Plus className="size-4" /> Nova regra
          </Button>
        ) : null}
      </div>
    </div>
  );
}
