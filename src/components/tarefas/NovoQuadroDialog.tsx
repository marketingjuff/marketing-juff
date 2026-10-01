import { useEffect, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FundoPicker, type FundoValor } from "./FundoPicker";
import {
  createQuadro,
  pessoasQueryOptions,
  setMembrosQuadro,
  updateQuadro,
  type Quadro,
} from "@/lib/tarefas";

/** Criação e edição de quadro. Só admin enxerga. */
export function NovoQuadroDialog({
  open,
  onOpenChange,
  quadro,
  somenteParticipantes = false,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quadro?: Quadro | null;
  somenteParticipantes?: boolean;
  onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: pessoas = [] } = useQuery({ ...pessoasQueryOptions, enabled: open });
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fundo, setFundo] = useState<FundoValor>({
    fundo_tipo: "solida",
    fundo_cor1: "#185fa5",
    fundo_cor2: "#042c53",
  });
  const [membros, setMembros] = useState<string[]>([]);
  const [acesso, setAcesso] = useState<"aberto" | "restrito">("aberto");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(quadro?.nome ?? "");
    setDescricao(quadro?.descricao ?? "");
    setFundo({
      fundo_tipo: quadro?.fundo_tipo ?? "solida",
      fundo_cor1: quadro?.fundo_cor1 ?? "#185fa5",
      fundo_cor2: quadro?.fundo_cor2 ?? "#042c53",
    });
    setMembros(quadro?.membros ?? []);
    setAcesso(quadro?.acesso ?? "aberto");
  }, [open, quadro]);

  async function salvar() {
    setSalvando(true);
    try {
      let id = quadro?.id;
      if (!somenteParticipantes) {
        if (id) await updateQuadro(id, { nome: nome.trim() || "Novo quadro", descricao, acesso, ...fundo });
        else id = await createQuadro(nome, { descricao, acesso, ...fundo });
      }
      if (id) await setMembrosQuadro(id, membros);
      if (id && somenteParticipantes) await updateQuadro(id, { acesso });
      await qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success(quadro ? "Quadro atualizado" : "Quadro criado");
      onOpenChange(false);
      if (id) onSaved?.(id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const titulo = somenteParticipantes ? "Participantes" : quadro ? "Editar quadro" : "Novo quadro";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {quadro ? quadro.nome : "O quadro nasce vazio. Você cria as colunas depois."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!somenteParticipantes ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="q-nome">Nome</Label>
                <Input id="q-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-desc">Descrição</Label>
                <Textarea
                  id="q-desc"
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fundo</Label>
                <FundoPicker value={fundo} onChange={setFundo} />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label>Acesso</Label>
            <div className="flex gap-2">
              {(["aberto", "restrito"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAcesso(v)}
                  className={cn(
                    "flex-1 rounded-lg border p-2 text-left text-sm",
                    acesso === v ? "border-primary bg-primary-soft font-medium" : "border-border",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {v === "aberto" ? <Globe className="size-4" /> : <Lock className="size-4" />}
                    {v === "aberto" ? "Aberto" : "Restrito"}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                    {v === "aberto"
                      ? "Todo mundo que tem Tarefas enxerga este quadro."
                      : "Só os participantes marcados e os admins."}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Participantes</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {pessoas.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={membros.includes(p.id)}
                    onCheckedChange={(c) =>
                      setMembros((m) => (c ? [...m, p.id] : m.filter((x) => x !== p.id)))
                    }
                  />
                  {p.nome || "Sem nome"}
                  <span className="text-xs capitalize text-muted-foreground">{p.role}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {acesso === "restrito"
                ? "Quem não estiver marcado não enxerga este quadro em lugar nenhum, nem os cards dele no Meu trabalho e no Calendário. Admin entra sempre."
                : "Quadro aberto. A marcação de participantes fica guardada e passa a valer se você mudar para restrito."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={salvando} onClick={salvar}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
