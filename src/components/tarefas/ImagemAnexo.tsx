import { useEffect, useState } from "react";
import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { imagemAnexo } from "@/lib/tarefas";
import { cn } from "@/lib/utils";

function Vista({ node, selected }: NodeViewProps) {
  const path = node.attrs["anexo"] as string | null;
  const [src, setSrc] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    if (!path) return;
    let vivo = true;
    imagemAnexo(path).then((u) => vivo && setSrc(u)).catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, [path]);
  return (
    <NodeViewWrapper as="span" className="inline-block max-w-full align-top" data-drag-handle>
      {!path ? (
        <span className="inline-flex items-center gap-2 rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Enviando imagem…
        </span>
      ) : erro ? (
        <span className="inline-block rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">Imagem removida</span>
      ) : src ? (
        <img src={src} alt="" className={cn("my-1 max-h-[28rem] max-w-full rounded-md", selected && "ring-2 ring-primary")} />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </NodeViewWrapper>
  );
}

/** Imagem colada na descrição: fica gravada como anexo do card e mostrada pelo caminho dele. */
export const ImagemAnexo = Image.extend({
  inline: true,
  group: "inline",
  addAttributes() {
    return {
      anexo: { default: null, parseHTML: (el) => el.getAttribute("data-anexo"), renderHTML: (a) => (a["anexo"] ? { "data-anexo": a["anexo"] } : {}) },
      anexoId: { default: null, parseHTML: (el) => el.getAttribute("data-anexo-id"), renderHTML: (a) => (a["anexoId"] ? { "data-anexo-id": a["anexoId"] } : {}) },
      temp: { default: null, rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-anexo]" }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(Vista);
  },
});
