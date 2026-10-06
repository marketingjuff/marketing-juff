import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { CORES_ETIQUETA, HEX_RE, corSugerida, createEtiqueta, etiquetasQueryOptions, type Etiqueta } from "@/lib/tarefas";

export function NovaEtiquetaForm({ quadroId, etiquetas, onCriada }: {
  quadroId: string;
  etiquetas: Etiqueta[];
  onCriada?: (id: string) => Promise<void> | void;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(() => corSugerida(etiquetas, quadroId));
  const [corTexto, setCorTexto] = useState("#111111");
  const [salvando, setSalvando] = useState(false);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (salvando || !nome.trim() || !HEX_RE.test(cor) || !HEX_RE.test(corTexto)) return;
      setSalvando(true);
      try {
        const nomeFinal = nome.trim().toUpperCase();
        await createEtiqueta(nomeFinal, cor, corTexto, quadroId);
        setNome("");
        await qc.invalidateQueries({ queryKey: etiquetasQueryOptions.queryKey });
        const atualizadas = await qc.fetchQuery(etiquetasQueryOptions);
        const criada = atualizadas.find((etiqueta) => etiqueta.quadro_id === quadroId && etiqueta.nome === nomeFinal);
        if (criada && onCriada) await onCriada(criada.id);
        toast.success("Etiqueta criada");
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setSalvando(false);
      }
    }}>
      <Label className="block">Nova etiqueta</Label>
      <Input aria-label="Nome da etiqueta" placeholder="Nome da etiqueta" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} disabled={salvando} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">Fundo <ColorPicker value={cor} onChange={setCor} disabled={salvando} label="Cor do fundo da etiqueta" presets={CORES_ETIQUETA} /></div>
        <div className="flex items-center gap-2">Texto <ColorPicker value={corTexto} onChange={setCorTexto} disabled={salvando} label="Cor do texto da etiqueta" presets={["#ffffff", "#111111", ...CORES_ETIQUETA]} /></div>
      </div>
      <Button type="submit" size="sm" disabled={salvando || !nome.trim() || !HEX_RE.test(cor) || !HEX_RE.test(corTexto)}>{salvando ? "Criando…" : "Criar etiqueta"}</Button>
    </form>
  );
}