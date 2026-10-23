import { useEffect, useRef } from "react";
import { ImagemAnexo } from "./ImagemAnexo";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import DOMPurify from "dompurify";
import { Bold, Italic, Underline as UIcon, Strikethrough, List, ListOrdered, Quote, Heading2, Undo2, Redo2, RemoveFormatting } from "lucide-react";
import { cn } from "@/lib/utils";

const FONTES = [
  { label: "Padrão", valor: "" },
  { label: "Serifada", valor: "Georgia, serif" },
  { label: "Mono", valor: "ui-monospace, monospace" },
  { label: "Arial", valor: "Arial, sans-serif" },
];
const CORES = ["#1f2937", "#6b7280", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#db2777"];

function paraHtml(v: string) {
  if (!v) return "";
  if (/^\s*<(p|h\d|ul|ol|blockquote|div|img)/i.test(v)) return DOMPurify.sanitize(v, { ADD_ATTR: ["data-anexo", "data-anexo-id"] });
  const esc = v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.split("\n").map((l) => `<p>${l}</p>`).join("");
}

function Btn({ ativo, onClick, children, title }: { ativo?: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground", ativo && "bg-muted text-foreground")}
    >
      {children}
    </button>
  );
}

function Barra({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1">
      <select
        className="h-7 rounded border border-border bg-background px-1 text-xs"
        value={editor.getAttributes("textStyle")["fontFamily"] ?? ""}
        onChange={(e) => (e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run())}
      >
        {FONTES.map((f) => <option key={f.label} value={f.valor}>{f.label}</option>)}
      </select>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title="Negrito" ativo={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
      <Btn title="Itálico" ativo={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
      <Btn title="Sublinhado" ativo={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><UIcon className="h-4 w-4" /></Btn>
      <Btn title="Riscado" ativo={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title="Título" ativo={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Btn>
      <Btn title="Marcadores" ativo={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn title="Lista numerada" ativo={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <Btn title="Citação" ativo={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <div className="flex items-center gap-0.5" title="Cor da fonte">
        {CORES.map((cor) => (
          <button
            key={cor}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => c().setColor(cor).run()}
            className={cn("h-4 w-4 rounded-full border border-border", editor.isActive("textStyle", { color: cor }) && "ring-2 ring-primary ring-offset-1")}
            style={{ backgroundColor: cor }}
          />
        ))}
      </div>
      <Btn title="Limpar formatação" onClick={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title="Desfazer" onClick={() => c().undo().run()}><Undo2 className="h-4 w-4" /></Btn>
      <Btn title="Refazer" onClick={() => c().redo().run()}><Redo2 className="h-4 w-4" /></Btn>
    </div>
  );
}

type Colar = (f: File) => Promise<{ id: string; path: string } | null>;

export function EditorDescricao({
  value, disabled, onChange, onBlur, onColarImagem, onEnvioChange, onDescartarImagem,
}: { value: string; disabled?: boolean; onChange: (html: string) => void; onBlur: (html: string) => void | Promise<void>; onColarImagem?: Colar; onEnvioChange?: (enviando: boolean) => void; onDescartarImagem?: (anexo: { id: string; path: string }) => Promise<void> }) {
  const colarRef = useRef<Colar | undefined>(onColarImagem);
  colarRef.current = onColarImagem;
  const edRef = useRef<Editor | null>(null);
  const pendentesRef = useRef(0);
  const callbacksRef = useRef({ onChange, onBlur, onEnvioChange, onDescartarImagem });
  callbacksRef.current = { onChange, onBlur, onEnvioChange, onDescartarImagem };

  function enviar(files: File[], pos?: number) {
    const ed = edRef.current;
    const colar = colarRef.current;
    if (!ed || !colar) return false;
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    const tipoImagem = ed.schema.nodes["image"];
    if (!imgs.length || !tipoImagem) return false;
    pendentesRef.current += imgs.length;
    callbacksRef.current.onEnvioChange?.(true);
    for (const f of imgs) {
      const temp = crypto.randomUUID();
      const node = tipoImagem.create({ temp });
      const tr = ed.state.tr;
      if (pos != null) tr.insert(pos, node); else tr.replaceSelectionWith(node);
      ed.view.dispatch(tr);
      void colar(f).then(async (r) => {
        const e = edRef.current;
        if (!e || e.isDestroyed) return;
        let achou: number | null = null;
        e.state.doc.descendants((n, p) => {
          if (n.type.name === "image" && n.attrs["temp"] === temp) achou = p;
        });
        if (achou == null) {
          if (r) await callbacksRef.current.onDescartarImagem?.(r);
          return;
        }
        const t = e.state.tr;
        if (r) t.setNodeMarkup(achou, undefined, { anexo: r.path, anexoId: r.id, temp: null });
        else t.delete(achou, achou + 1);
        e.view.dispatch(t);
      }).finally(async () => {
        pendentesRef.current -= 1;
        if (pendentesRef.current > 0) return;
        const e = edRef.current;
        try {
          if (e && !e.isDestroyed) {
            const html = e.isEmpty ? "" : e.getHTML();
            callbacksRef.current.onChange(html);
            // O envio termina sem um novo blur: gravar explicitamente o documento final.
            await callbacksRef.current.onBlur(html);
          }
        } finally {
          callbacksRef.current.onEnvioChange?.(false);
        }
      });
    }
    return true;
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ImagemAnexo,
      TextStyle,
      Color,
      FontFamily,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
    ],
    content: paraHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: { class: "descricao-rica min-h-[22rem] px-3 py-2 outline-none" },
      handlePaste: (_v, ev) => {
        const files = Array.from(ev.clipboardData?.files ?? []);
        if (enviar(files)) { ev.preventDefault(); return true; }
        return false;
      },
      handleDrop: (view, ev) => {
        const files = Array.from((ev as DragEvent).dataTransfer?.files ?? []);
        if (!files.some((f) => f.type.startsWith("image/"))) return false;
        const pos = view.posAtCoords({ left: ev.clientX, top: ev.clientY })?.pos;
        ev.preventDefault();
        return enviar(files, pos);
      },
    },
    onUpdate: ({ editor }) => callbacksRef.current.onChange(editor.isEmpty ? "" : editor.getHTML()),
    onBlur: ({ editor }) => {
      // Placeholders são locais e nunca devem ser enviados como imagens vazias.
      if (pendentesRef.current === 0) void callbacksRef.current.onBlur(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  edRef.current = editor;
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    if (!editor || editor.isFocused || pendentesRef.current > 0) return;
    const atual = editor.isEmpty ? "" : editor.getHTML();
    if (atual !== value) editor.commands.setContent(paraHtml(value), { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background", disabled && "opacity-70")}>
      {editor && !disabled && <Barra editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
