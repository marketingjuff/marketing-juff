import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

import type { Story } from "@/lib/stories";
import type { Objective } from "@/lib/objectives";

import { parsePlan, readDocx, validatePlan, type PlanValidation } from "@/lib/story-plan";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PlanDialog({
  open,
  stories,
  objetivos = [],
  onOpenChange,
  onApply,
}: {
  open: boolean;
  stories: Story[];
  objetivos?: Objective[];
  onOpenChange: (open: boolean) => void;
  onApply: (validation: PlanValidation) => void;
}) {
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [validation, setValidation] = useState<PlanValidation | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function analisar(conteudo: string) {
    setValidation(validatePlan(parsePlan(conteudo), stories, objetivos));
  }


  async function carregarArquivo(file: File) {
    setLendo(true);
    try {
      const conteudo = await readDocx(file);
      setTexto(conteudo);
      analisar(conteudo);
    } finally {
      setLendo(false);
    }
  }

  const campanhas = validation?.blocos.filter((b) => b.artes.length > 1).length ?? 0;
  const solos = (validation?.blocos.length ?? 0) - campanhas;
  const sobras = validation?.sobras ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setTexto("");
          setValidation(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aplicar plano</DialogTitle>
          <DialogDescription>
            Suba o documento Word devolvido pela análise ou cole o texto do plano.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="gap-2"
            disabled={lendo}
            onClick={() => inputRef.current?.click()}
          >
            {lendo ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            Escolher arquivo .docx
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void carregarArquivo(file);
              e.target.value = "";
            }}
          />

          <Textarea
            rows={8}
            value={texto}
            placeholder={"BLOCO | 1 | SOLO | DESACELERAR\nARTE | prancheta 4 | ... | ... | Nenhum\nSOBRA | prancheta 5 | motivo curto"}
            onChange={(e) => {
              setTexto(e.target.value);
              setValidation(null);
            }}
            className="font-mono text-xs"
          />

          <Button variant="secondary" disabled={!texto.trim()} onClick={() => analisar(texto)}>
            Validar plano
          </Button>

          {validation ? (
            validation.ok ? (
              <div className="space-y-2 rounded-xl border border-success/60 bg-success/5 p-3 text-sm">
                <p className="font-medium">
                  {validation.blocos.length} blocos · {campanhas} campanhas · {solos} solos
                </p>
                <ol className="space-y-1 text-xs text-muted-foreground">
                  {validation.blocos.map((b, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">
                        {i + 1}. {b.nome || "Sem nome"} ({b.artes.length > 1 ? "CAMPANHA" : "SOLO"})
                      </span>{" "}
                      — {b.artes.map((a) => a.nome_arquivo).join(", ")}
                    </li>
                  ))}
                </ol>
                {sobras.length > 0 ? (
                  <div className="border-t border-border pt-2">
                    <p className="text-xs font-medium">Ficam de fora: {sobras.length} arte(s)</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {sobras.map((s) => (
                        <li key={s.nome_arquivo} className="truncate">
                          {s.nome_arquivo} — {s.motivo || "sem motivo informado"}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Elas vão para "Não utilizadas". Nada é apagado.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-destructive/60 bg-destructive/5 p-3 text-sm">
                <p className="font-medium">O plano tem problemas e nada será aplicado.</p>
                {validation.blocos.length === 0 ? (
                  <p className="text-xs">Nenhuma linha BLOCO, ARTE ou SOBRA foi reconhecida.</p>
                ) : null}
                {validation.faltando.length > 0 ? (
                  <p className="text-xs">Faltando: {validation.faltando.join(", ")}</p>
                ) : null}
                {validation.repetidos.length > 0 ? (
                  <p className="text-xs">Repetidos: {validation.repetidos.join(", ")}</p>
                ) : null}
                {validation.desconhecidos.length > 0 ? (
                  <p className="text-xs">Não reconhecidos: {validation.desconhecidos.join(", ")}</p>
                ) : null}
                {validation.recursosInvalidos.length > 0 ? (
                  <p className="text-xs">
                    Recursos inválidos: {validation.recursosInvalidos.join(", ")}
                  </p>
                ) : null}
                {validation.blocosCheios.length > 0 ? (
                  <p className="text-xs">
                    Blocos acima do limite: {validation.blocosCheios.join(", ")}
                  </p>
                ) : null}
              </div>
            )
          ) : null}

          {validation && validation.objetivosDesconhecidos.length > 0 ? (
            <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs">
              Objetivos não cadastrados (os blocos ficam sem objetivo):{" "}
              {validation.objetivosDesconhecidos.join(", ")}
            </p>
          ) : null}

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!validation?.ok}
            onClick={() => {
              if (validation?.ok) onApply(validation);
            }}
          >
            Confirmar e aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
