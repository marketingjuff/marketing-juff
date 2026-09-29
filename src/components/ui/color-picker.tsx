import { useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HEX_RE = /^#[0-9a-f]{6}$/;

type Hsv = { h: number; s: number; v: number };

function normalizarHex(valor: string): string {
  const limpo = valor.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 6);
  return `#${limpo}`;
}

function hexParaHsv(hex: string): Hsv {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: h < 0 ? h + 360 : h, s: max ? d / max : 0, v: max };
}

function hsvParaHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function ColorPicker({
  value,
  onChange,
  label = "Cor",
  disabled,
  presets = [],
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  disabled?: boolean;
  presets?: string[];
  className?: string;
}) {
  const corValida = HEX_RE.test(value.toLowerCase()) ? value.toLowerCase() : "#000000";
  const [hsv, setHsv] = useState<Hsv>(() => hexParaHsv(corValida));
  const [texto, setTexto] = useState(value.toLowerCase());
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!HEX_RE.test(value.toLowerCase())) return;
    setTexto(value.toLowerCase());
    setHsv(hexParaHsv(value.toLowerCase()));
  }, [value]);

  const aplicarHsv = (novo: Hsv) => {
    setHsv(novo);
    const hex = hsvParaHex(novo);
    setTexto(hex);
    onChange(hex);
  };

  const moverPainel = (clientX: number, clientY: number) => {
    const rect = painelRef.current?.getBoundingClientRect();
    if (!rect) return;
    aplicarHsv({
      ...hsv,
      s: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      v: 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    });
  };

  const valido = HEX_RE.test(texto);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={`${label}: ${corValida}`}
          title={`${label}: ${corValida}`}
          className={cn("relative size-8 overflow-hidden p-1", className)}
        >
          <span className="size-full rounded-sm border border-border" style={{ backgroundColor: corValida }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3 p-3" align="start">
        <div className="flex items-center gap-2">
          <Pipette className="size-4 text-muted-foreground" />
          <Label className="text-xs font-medium">{label}</Label>
        </div>
        <div
          ref={painelRef}
          role="slider"
          aria-label={`${label}: tom claro ou escuro`}
          tabIndex={0}
          className="relative h-36 w-full touch-none cursor-crosshair overflow-hidden rounded-md border border-border"
          style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            moverPainel(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) moverPainel(event.clientX, event.clientY);
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
          <span className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
          <span
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/40"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={360}
          value={Math.round(hsv.h)}
          aria-label="Círculo cromático"
          className="color-picker-hue h-4 w-full cursor-pointer appearance-none rounded-full"
          onChange={(event) => aplicarHsv({ ...hsv, h: Number(event.target.value) })}
        />
        {presets.length ? (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((cor) => (
              <button
                key={cor}
                type="button"
                aria-label={`Usar ${cor}`}
                title={cor}
                className="size-6 rounded-full border border-border"
                style={{ backgroundColor: cor }}
                onClick={() => {
                  const hex = cor.toLowerCase();
                  setHsv(hexParaHsv(hex));
                  setTexto(hex);
                  onChange(hex);
                }}
              />
            ))}
          </div>
        ) : null}
        <div>
          <Input
            value={texto}
            maxLength={7}
            spellCheck={false}
            aria-invalid={!valido}
            className={cn("h-8 font-mono text-xs", !valido && "border-destructive")}
            onChange={(event) => {
              const hex = normalizarHex(event.target.value);
              setTexto(hex);
              if (HEX_RE.test(hex)) {
                setHsv(hexParaHsv(hex));
                onChange(hex);
              }
            }}
          />
          {!valido ? <p className="mt-1 text-[11px] text-destructive">Use # e seis dígitos hexadecimais</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}