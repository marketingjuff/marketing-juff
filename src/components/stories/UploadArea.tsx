import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadArea({
  onFiles,
  busy,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handle(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-6 text-center shadow-soft transition-colors",
        over && "border-primary bg-primary-soft",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {busy ? (
        <Loader2 className="size-6 animate-spin text-primary" />
      ) : (
        <ImagePlus className="size-6 text-primary" />
      )}
      <p className="text-sm font-medium">
        {busy ? "Enviando imagens…" : "Arraste imagens aqui ou clique para escolher"}
      </p>
      <p className="text-xs text-muted-foreground">
        Cada imagem cria um story novo. As fotos são comprimidas antes do envio.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
