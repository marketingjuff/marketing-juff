import { useEffect, useState } from "react";

import { RECURSOS, blocoTipo, type Recurso, type Story } from "@/lib/stories";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StoryEditValues = {
  nome_bloco: string;
  frames: { id: string; texto_principal: string; observacao: string; recurso: Recurso }[];
};

export function StoryEditor({
  story,
  open,
  editable,
  onOpenChange,
  onSave,
}: {
  story: Story | null;
  open: boolean;
  editable: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: StoryEditValues) => void;
}) {
  const [values, setValues] = useState<StoryEditValues>({ nome_bloco: "", frames: [] });

  useEffect(() => {
    if (!story) return;
    setValues({
      nome_bloco: story.nome_bloco,
      frames: story.frames.map((f) => ({
        id: f.id,
        texto_principal: f.texto_principal,
        observacao: f.observacao,
        recurso: f.recurso,
      })),
    });
  }, [story]);

  if (!story) return null;
  const campanha = blocoTipo(story) === "CAMPANHA";

  function setFrame(id: string, patch: Partial<StoryEditValues["frames"][number]>) {
    setValues((v) => ({
      ...v,
      frames: v.frames.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{campanha ? "Campanha" : "Story solo"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome-bloco">Nome do bloco</Label>
            <Input
              id="nome-bloco"
              value={values.nome_bloco}
              disabled={!editable}
              placeholder="OUTUBRO ROSA"
              onChange={(e) => setValues((v) => ({ ...v, nome_bloco: e.target.value }))}
            />
          </div>

          {story.frames.map((frame, index) => {
            const value = values.frames.find((f) => f.id === frame.id);
            if (!value) return null;
            return (
              <div key={frame.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  {frame.url ? (
                    <img
                      src={frame.url}
                      alt={frame.nome_arquivo}
                      className="h-16 w-9 rounded object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {frame.nome_arquivo || "Sem nome"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {index + 1}/{story.frames.length}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Texto principal</Label>
                  <Textarea
                    rows={2}
                    value={value.texto_principal}
                    disabled={!editable}
                    onChange={(e) => setFrame(frame.id, { texto_principal: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Observação</Label>
                  <Textarea
                    rows={2}
                    value={value.observacao}
                    disabled={!editable}
                    onChange={(e) => setFrame(frame.id, { observacao: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Recurso</Label>
                  <Select
                    value={value.recurso}
                    disabled={!editable}
                    onValueChange={(v) => setFrame(frame.id, { recurso: v as Recurso })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURSOS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}

          {editable ? (
            <Button className="w-full" onClick={() => onSave(values)}>
              Salvar textos
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
