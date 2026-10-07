import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siglaPessoa } from "@/lib/tarefas";
import { usePresetsMarca } from "@/hooks/use-presets-marca";

/** Cada pessoa ajusta a própria bolinha (sigla, fundo e texto). */
export function MinhaBolinha() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["minha-bolinha"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, sigla, cor_avatar, cor_texto_avatar")
        .eq("id", u.user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const [sigla, setSigla] = useState("");
  const [fundo, setFundo] = useState("#378add");
  const [texto, setTexto] = useState("#ffffff");
  const [salvando, setSalvando] = useState(false);
  const presetsMarca = usePresetsMarca();

  useEffect(() => {
    if (!data) return;
    setSigla(data.sigla ?? "");
    setFundo(data.cor_avatar ?? "#378add");
    setTexto(data.cor_texto_avatar ?? "#ffffff");
  }, [data]);

  if (!data) return null;
  const mostrada = sigla || siglaPessoa({ nome: data.nome });

  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabase
      .from("profiles")
      .update({ sigla: sigla || null, cor_avatar: fundo, cor_texto_avatar: texto })
      .eq("id", data.id);
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bolinha salva");
    qc.invalidateQueries();
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h2 className="text-base font-semibold">Minha bolinha</h2>
      <p className="text-sm text-muted-foreground">Como você aparece nos cards.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-full text-xs font-semibold"
          style={{ backgroundColor: fundo, color: texto }}
        >
          {mostrada}
        </span>
        <Input
          value={sigla}
          placeholder={siglaPessoa({ nome: data.nome })}
          aria-label="Sigla de até três caracteres"
          className="h-8 w-20 text-center font-mono text-xs uppercase"
          onChange={(e) => setSigla(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3))}
        />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Fundo
          <ColorPicker value={fundo} onChange={setFundo} label="Cor do fundo da bolinha" presets={presetsMarca} />
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Texto
          <ColorPicker value={texto} onChange={setTexto} label="Cor do texto da bolinha" presets={["#ffffff", "#111111", ...presetsMarca]} />
        </span>
        <Button size="sm" onClick={salvar} disabled={salvando}>Salvar</Button>
      </div>
    </section>
  );
}
