import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import DOMPurify from "dompurify";
import { Bold, Italic, Underline as UIcon, Strikethrough, List, ListOrdered, Quote, Link2, RemoveFormatting } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { usePresetsMarca } from "@/hooks/use-presets-marca";


export function htmlDeComentario(v: string) {
  if (!v) return "";
  if (/^\s*<(p|h\d|ul|ol|blockquote|div)/i.test(v)) return DOMPurify.sanitize(v);
  const esc = v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.split("\n").map((l) => `<p>${l}</p>`).join("");
}

export function comentarioVazio(html: string) {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}

function Btn({ ativo, onClick, children, title }: { ativo?: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={title}
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("size-7 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground", ativo && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  );
}

function Barra({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const presets = usePresetsMarca();
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1">
      <Btn title="Negrito" ativo={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Btn>
      <Btn title="Itálico" ativo={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Btn>
      <Btn title="Sublinhado" ativo={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><UIcon className="h-3.5 w-3.5" /></Btn>
      <Btn title="Riscado" ativo={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5" /></Btn>
      <span className="mx-1 h-4 w-px bg-border" />
      <Btn title="Marcadores" ativo={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></Btn>
      <Btn title="Lista numerada" ativo={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></Btn>
      <Btn title="Citação" ativo={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5" /></Btn>
      <Btn
        title="Link"
        ativo={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) {
            c().unsetLink().run();
            return;
          }
          const atual = editor.getAttributes("link")["href"] ?? "";
          const destino = window.prompt("Endereço do link", atual);
          if (destino === null) return;
          if (destino.trim() === "") {
            c().unsetLink().run();
            return;
          }
          c().setLink({ href: destino.trim() }).run();
        }}
      >
        <Link2 className="h-3.5 w-3.5" />
      </Btn>
      <span className="mx-1 h-4 w-px bg-border" />
      <ColorPicker
        label="Cor do texto"
        value={editor.getAttributes("textStyle")["color"] ?? "#1f2937"}
        onChange={(cor) => c().setColor(cor).run()}
        presets={presets}
        className="size-7"
      />
      <Btn title="Limpar formatação" onClick={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-3.5 w-3.5" /></Btn>
    </div>
  );
}

export function EditorComentario({
  value, disabled, placeholder, onChange,
}: { value: string; disabled?: boolean; placeholder?: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyle,
      Color,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
    ],
    content: htmlDeComentario(value),
    editable: !disabled,
    editorProps: { attributes: { class: "comentario-rico min-h-[6rem] px-3 py-2 outline-none", role: "textbox", "aria-label": placeholder ?? "Editar comentário", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    if (!editor || (editor.isFocused && value !== "")) return;
    const atual = editor.isEmpty ? "" : editor.getHTML();
    if (atual !== value) editor.commands.setContent(htmlDeComentario(value), { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background", disabled && "opacity-70")}>
      {editor ? <Barra editor={editor} /> : null}
      <EditorContent editor={editor} />
      {editor && editor.isEmpty && placeholder ? (
        <div className="pointer-events-none -mt-8 px-3 pb-2 text-[14px] text-muted-foreground">{placeholder}</div>
      ) : null}
    </div>
  );
}
