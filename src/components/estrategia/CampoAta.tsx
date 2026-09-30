import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { IconeCampo } from "@/components/estrategia/IconeCampo";

export function CampoAta({
  label,
  icone,
  valor,
  editavel,
  onSalvar,
}: {
  label: string;
  icone: string;
  valor: string;
  editavel: boolean;
  onSalvar: (novo: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editando) setTexto(valor);
  }, [valor, editando]);

  useEffect(() => {
    if (editando && ref.current) {
      ref.current.focus();
      ref.current.selectionStart = ref.current.value.length;
    }
  }, [editando]);

  function concluir() {
    setEditando(false);
    if (texto !== valor) onSalvar(texto);
  }

  return (
    <div className="min-w-0">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <IconeCampo nome={icone} className="size-3.5" />
        {label}
      </p>
      {editando ? (
        <Textarea
          ref={ref}
          value={texto}
          rows={2}
          className="text-sm"
          onChange={(e) => setTexto(e.target.value)}
          onBlur={concluir}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setTexto(valor);
              setEditando(false);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) concluir();
          }}
        />
      ) : (
        <button
          type="button"
          disabled={!editavel}
          onClick={() => editavel && setEditando(true)}
          className="w-full rounded-md px-1 py-1 text-left text-sm hover:bg-muted/60 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {valor.trim() ? (
            <span className="whitespace-pre-wrap">{valor}</span>
          ) : (
            <span className="text-muted-foreground">{editavel ? "Clique para escrever" : "Vazio"}</span>
          )}
        </button>
      )}
    </div>
  );
}
