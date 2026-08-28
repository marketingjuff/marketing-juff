import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Layers,
  Grid3X3,
  Trash2,
  Upload,
  Download,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Plus,
  Type,
  Move,

} from "lucide-react";
import { toast } from "sonner";

import type { AlinhamentoTexto, Composicao, Frame } from "@/lib/stories";
import {
  CORES_MARCA,
  FONTES,
  PESOS,
  PONTOS_GRADE,
  criarPreset,
  enviarLogo,
  excluirLogo,
  excluirPreset,
  exportarArteMontada,
  grudarNaGrade,
  dimensoesLogo,
  normalizarHex,
  logosQueryOptions,
  presetsQueryOptions,
  proporcaoDoSvg,
  svgColorido,
  tamanhoFontePx,
  corComOpacidade,
  type LogoAsset,
  type Preset,
} from "@/lib/story-editor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Impede que o editor dispare o arraste do card. */
const semArraste = {
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
  onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
};

const ALINHAMENTOS: { value: AlinhamentoTexto; label: string; Icone: typeof AlignLeft }[] = [
  { value: "left", label: "Alinhar à esquerda", Icone: AlignLeft },
  { value: "center", label: "Centralizar", Icone: AlignCenter },
  { value: "right", label: "Alinhar à direita", Icone: AlignRight },
];

function SeletorCor({
  cor,
  disabled,
  onCommit,
  titulo,
}: {
  cor: string;
  disabled?: boolean;
  onCommit: (cor: string) => void;
  titulo: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [local, setLocal] = useState(normalizarHex(cor) ?? "#000000");
  const [texto, setTexto] = useState(normalizarHex(cor) ?? "#000000");
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const hex = normalizarHex(cor) ?? "#000000";
    setLocal(hex);
    setTexto(hex);
    setErro(false);
  }, [cor]);

  const aplicar = (hex: string) => {
    setLocal(hex);
    setTexto(hex);
    setErro(false);
  };

  return (
    <Popover
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v && local !== cor) onCommit(local);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={titulo}
          title={`${titulo} (${local})`}
          className="size-6 shrink-0 rounded border border-border"
          style={{ background: local }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2 p-2" align="start">
        <p className="text-[11px] font-medium text-muted-foreground">{titulo}</p>
        <div className="grid grid-cols-8 gap-1">
          {CORES_MARCA.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={`${c.nome} ${c.hex}`}
              aria-label={c.nome}
              onClick={() => aplicar(normalizarHex(c.hex) ?? c.hex)}
              className={cn(
                "size-5 rounded border border-border",
                local === (normalizarHex(c.hex) ?? c.hex) && "ring-2 ring-primary",
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
        <input
          type="color"
          value={local}
          onChange={(e) => aplicar(normalizarHex(e.target.value) ?? local)}
          className="h-8 w-full cursor-pointer rounded border border-border bg-background"
          aria-label="Escolha livre de cor"
        />
        <Input
          value={texto}
          spellCheck={false}
          placeholder="#000000"
          aria-label="Código hexadecimal da cor"
          className="h-8 font-mono text-xs"
          onChange={(e) => {
            const valor = e.target.value;
            setTexto(valor);
            const hex = normalizarHex(valor);
            if (hex) {
              setLocal(hex);
              setErro(false);
            } else {
              setErro(true);
            }
          }}
          onBlur={() => {
            const hex = normalizarHex(texto);
            if (hex) {
              aplicar(hex);
            } else {
              setErro(true);
            }
          }}
        />
        {erro ? (
          <p className="text-[11px] font-medium text-destructive">
            Use um hexadecimal válido, como #1d2546
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ControleTamanho({
  label,
  valor,
  disabled,
  onCommit,
}: {
  label: string;
  valor: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(valor);
  useEffect(() => setLocal(valor), [valor]);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular font-medium text-foreground">{local}</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        disabled={disabled ?? false}
        value={[local]}
        onValueChange={(v) => setLocal(v[0] ?? local)}
        onValueCommit={(v) => onCommit(v[0] ?? local)}
      />
    </div>
  );
}

function PainelTexto({
  comp,
  editable,
  podeGerir,
  salvar,
}: {
  comp: Composicao;
  editable: boolean;
  podeGerir: boolean;
  salvar: (patch: Partial<Composicao>) => void;
}) {
  const queryClient = useQueryClient();
  const { data: presets = [] } = useQuery(presetsQueryOptions);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState(false);
  const [opacidade, setOpacidade] = useState(comp.sombra_opacidade);
  const [larguraCaixa, setLarguraCaixa] = useState(comp.texto_largura);

  useEffect(() => setOpacidade(comp.sombra_opacidade), [comp.sombra_opacidade]);
  useEffect(() => setLarguraCaixa(comp.texto_largura), [comp.texto_largura]);

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto">
        <div className="space-y-3 rounded-lg border border-border p-2">
          <Select
            value={comp.texto_fonte}
            disabled={!editable}
            onValueChange={(v) => salvar({ texto_fonte: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            {PESOS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={comp.texto_peso === p.value ? "default" : "outline"}
                className="flex-1 px-1 text-[11px]"
                disabled={!editable}
                onClick={() => salvar({ texto_peso: p.value })}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-1">
            {ALINHAMENTOS.map((a) => (
              <Button
                key={a.value}
                size="sm"
                variant={comp.texto_alinhamento === a.value ? "default" : "outline"}
                className="flex-1 px-1"
                disabled={!editable}
                title={a.label}
                aria-label={a.label}
                onClick={() => salvar({ texto_alinhamento: a.value })}
              >
                <a.Icone className="size-3.5" />
              </Button>
            ))}
          </div>

          <ControleTamanho
            label="Tamanho"
            valor={comp.texto_tamanho}
            disabled={!editable}
            onCommit={(v) => salvar({ texto_tamanho: v })}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Largura da caixa</span>
              <span className="tabular font-medium text-foreground">{larguraCaixa}%</span>
            </div>
            <Slider
              min={10}
              max={100}
              step={1}
              disabled={!editable}
              value={[larguraCaixa]}
              onValueChange={(v) => setLarguraCaixa(v[0] ?? larguraCaixa)}
              onValueCommit={(v) => salvar({ texto_largura: v[0] ?? larguraCaixa })}
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex-1">Cor do texto</span>
            <SeletorCor
              cor={comp.texto_cor}
              disabled={!editable}
              titulo="Cor do texto"
              onCommit={(cor) => salvar({ texto_cor: cor })}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex-1">Cor da sombra</span>
            <SeletorCor
              cor={comp.sombra_cor}
              disabled={!editable}
              titulo="Cor da sombra"
              onCommit={(cor) => salvar({ sombra_cor: cor })}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Opacidade da sombra</span>
              <span className="tabular font-medium text-foreground">{opacidade}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              disabled={!editable}
              value={[opacidade]}
              onValueChange={(v) => setOpacidade(v[0] ?? opacidade)}
              onValueCommit={(v) => salvar({ sombra_opacidade: v[0] ?? opacidade })}
            />
          </div>

          {podeGerir ? (
            <div className="space-y-1 border-t border-border pt-2">
              <Input
                value={nome}
                placeholder="Nome da pré-formatação"
                className="h-8 text-xs"
                onChange={(e) => {
                  setNome(e.target.value);
                  if (erroNome) setErroNome(false);
                }}
              />
              {erroNome ? (
                <p className="text-[11px] font-medium text-destructive">Dê um nome antes de salvar</p>
              ) : null}
              <Button
                size="sm"
                className="w-full"
                onClick={async () => {
                  if (nome.trim().length === 0) {
                    setErroNome(true);
                    return;
                  }
                  try {
                    await criarPreset({
                      nome: nome.trim(),
                      fonte: comp.texto_fonte,
                      peso: comp.texto_peso,
                      alinhamento: comp.texto_alinhamento,
                      tamanho: comp.texto_tamanho,
                      cor_texto: comp.texto_cor,
                      cor_sombra: comp.sombra_cor,
                      opacidade_sombra: comp.sombra_opacidade,
                    });
                    setNome("");
                    await queryClient.invalidateQueries({ queryKey: ["story-text-presets"] });
                    toast.success("Pré-formatação salva");
                  } catch {
                    toast.error("Não foi possível salvar a pré-formatação");
                  }
                }}
              >
                Salvar
              </Button>
            </div>
          ) : null}

          {podeGerir && presets.length > 0 ? (
            <div className="space-y-1 border-t border-border pt-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                Excluir pré-formatações
              </span>
              {presets.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="size-3.5 shrink-0 rounded border border-border"
                    style={{ background: p.cor_texto }}
                  />
                  <span className="min-w-0 flex-1 truncate" title={p.nome}>
                    {p.nome}
                  </span>
                  <button
                    type="button"
                    aria-label={`Excluir ${p.nome}`}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      if (!window.confirm(`Excluir a pré-formatação "${p.nome}"?`)) return;
                      try {
                        await excluirPreset(p.id);
                        await queryClient.invalidateQueries({ queryKey: ["story-text-presets"] });
                      } catch {
                        toast.error("Não foi possível excluir a pré-formatação");
                      }
                    }}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
    </div>
  );
}

/** Atalhos de pré-formatação exibidos abaixo da arte, no card. */
export function FileiraPresets({
  comp,
  editable,
  onAplicar,
}: {
  comp: Composicao;
  editable: boolean;
  onAplicar: (patch: Partial<Composicao>) => void;
}) {
  const btn = (ativo: boolean) =>
    cn(
      "flex size-6 shrink-0 items-center justify-center rounded-md border border-border text-[12px] hover:bg-secondary disabled:opacity-50",
      ativo && "bg-primary text-primary-foreground hover:bg-primary",
    );

  const outraFonte = FONTES[(FONTES.indexOf(comp.texto_fonte as never) + 1) % FONTES.length]!;
  const [sombra, setSombra] = useState(comp.sombra_opacidade);
  const [abertoPresets, setAbertoPresets] = useState(false);
  const { data: presets = [] } = useQuery(presetsQueryOptions);
  useEffect(() => setSombra(comp.sombra_opacidade), [comp.sombra_opacidade]);

  return (
    <div className="flex flex-col gap-y-1" {...semArraste}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex items-center gap-0.5">
          {PESOS.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={!editable}
              className={btn(comp.texto_peso === p.value)}
              style={{ fontWeight: p.value }}
              onClick={() => onAplicar({ texto_peso: p.value })}
            >
              A
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={!editable || comp.texto_tamanho <= 1}
            className={btn(false)}
            onClick={() => onAplicar({ texto_tamanho: comp.texto_tamanho - 1 })}
          >
            <Minus className="size-3" />
          </button>
          <span className="w-4 text-center text-[11px] tabular-nums">{comp.texto_tamanho}</span>
          <button
            type="button"
            disabled={!editable || comp.texto_tamanho >= 10}
            className={btn(false)}
            onClick={() => onAplicar({ texto_tamanho: comp.texto_tamanho + 1 })}
          >
            <Plus className="size-3" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          {ALINHAMENTOS.map(({ value, label, Icone }) => (
            <button
              key={value}
              type="button"
              disabled={!editable}
              title={label}
              className={btn(comp.texto_alinhamento === value)}
              onClick={() => onAplicar({ texto_alinhamento: value })}
            >
              <Icone className="size-3" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={!editable}
            title={comp.texto_fonte}
            className={btn(false)}
            onClick={() => onAplicar({ texto_fonte: outraFonte })}
          >
            <Type className="size-3" />
          </button>

          <Popover open={abertoPresets} onOpenChange={setAbertoPresets}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!editable}
                title="Pré-formatações salvas"
                className={btn(false)}
              >
                <Layers className="size-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end" {...semArraste}>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                Pré-formatações
              </p>
              {presets.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-muted-foreground">
                  Nenhuma pré-formatação salva
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] hover:bg-secondary"
                      onClick={() => {
                        onAplicar({
                          texto_fonte: p.fonte,
                          texto_peso: p.peso,
                          texto_tamanho: p.tamanho,
                          texto_alinhamento: p.alinhamento,
                          texto_cor: p.cor_texto,
                          sombra_cor: p.cor_sombra,
                          sombra_opacidade: p.opacidade_sombra,
                        });
                        setAbertoPresets(false);
                      }}
                    >
                      <span
                        className="size-3 shrink-0 rounded border border-border"
                        style={{ background: p.cor_texto }}
                      />
                      <span className="min-w-0 flex-1 truncate" title={p.nome}>
                        {p.nome}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex w-full items-center gap-2">
        <span className="shrink-0 text-[10px] text-muted-foreground">Sombra</span>
        <Slider
          className="flex-1"
          min={0}
          max={100}
          step={1}
          disabled={!editable}
          value={[sombra]}
          onValueChange={(v) => setSombra(v[0] ?? sombra)}
          onValueCommit={(v) => onAplicar({ sombra_opacidade: v[0] ?? sombra, sombra_cor: "#000000" })}
        />
        <span className="w-6 text-center text-[10px] tabular-nums">{sombra}%</span>
      </div>
    </div>
  );
}


function PainelLogos({
  comp,
  editable,
  podeGerir,
  salvar,
}: {
  comp: Composicao;
  editable: boolean;
  podeGerir: boolean;
  salvar: (patch: Partial<Composicao>) => void;
}) {
  const queryClient = useQueryClient();
  const { data: logos = [] } = useQuery(logosQueryOptions);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto">
      <p className="text-[11px] font-medium text-muted-foreground">Biblioteca de logos</p>
      <div className="flex flex-wrap gap-2">
        {logos.map((logo) => (
          <div key={logo.id} className="relative">
            <button
              type="button"
              disabled={!editable}
              title={logo.nome}
              className={cn(
                "flex size-14 items-center justify-center rounded-md border border-border bg-secondary p-1 hover:ring-2 hover:ring-primary disabled:opacity-50",
                comp.logo_id === logo.id && "ring-2 ring-primary",
              )}
              onClick={() => salvar({ logo_id: logo.id, logo_ativo: true })}
            >
              <img src={logo.url} alt={logo.nome} className="max-h-full max-w-full" />
            </button>
            {podeGerir ? (
              <button
                type="button"
                aria-label={`Excluir ${logo.nome}`}
                className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 text-muted-foreground shadow hover:text-destructive"
                onClick={async () => {
                  if (!window.confirm(`Excluir o logo "${logo.nome}" da biblioteca?`)) return;
                  try {
                    await excluirLogo(logo.id);
                    await queryClient.invalidateQueries({ queryKey: ["story-logos"] });
                  } catch {
                    toast.error("Não foi possível excluir o logo");
                  }
                }}
              >
                <Trash2 className="size-3" />
              </button>
            ) : null}
          </div>
        ))}

        {podeGerir ? (
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
            aria-label="Enviar novo logo SVG"
            onClick={() => arquivoRef.current?.click()}
          >
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          </button>
        ) : null}
      </div>

      <input
        ref={arquivoRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setEnviando(true);
          try {
            await enviarLogo(file, file.name.replace(/\.svg$/i, ""));
            await queryClient.invalidateQueries({ queryKey: ["story-logos"] });
            toast.success("Logo enviado para a biblioteca");
          } catch (erro) {
            toast.error(erro instanceof Error ? erro.message : "Falha ao enviar o logo");
          } finally {
            setEnviando(false);
          }
        }}
      />

      {comp.logo_id ? (
        <div className="space-y-3 rounded-lg border border-border p-2">
          <ControleTamanho
            label="Tamanho do logo"
            valor={comp.logo_tamanho}
            disabled={!editable}
            onCommit={(v) => salvar({ logo_tamanho: v })}
          />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex-1">Cor do logo</span>
            <SeletorCor
              cor={comp.logo_cor}
              disabled={!editable}
              titulo="Cor do logo"
              onCommit={(cor) => salvar({ logo_cor: cor })}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={!editable}
            onClick={() => salvar({ logo_ativo: false, logo_id: null })}
          >
            Remover logo da arte
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Camada arrastável com efeito ímã na grade. */
function Camada({
  x,
  y,
  editable,
  alinhamento = "center",
  arrasteSoPelaAlca,
  onCommit,
  children,
}: {
  x: number;
  y: number;
  editable: boolean;
  alinhamento?: AlinhamentoTexto;
  /** Quando ligado, o corpo não arrasta: só a alça devolvida ao children. */
  arrasteSoPelaAlca?: boolean;
  onCommit: (x: number, y: number) => void;
  children: React.ReactNode | ((iniciar: (e: React.PointerEvent) => void) => React.ReactNode);
}) {
  const [pos, setPos] = useState({ x, y });
  const arrastando = useRef(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!arrastando.current) setPos({ x, y });
  }, [x, y]);

  const iniciarArraste = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!editable) return;
    const pai = caixaRef.current?.parentElement;
    if (!pai) return;
    const rect = pai.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const posInicial = { ...pos };
    const inicioEm = performance.now();
    let comecou = false;

    const calcularPosicao = (ev: PointerEvent) => ({
      x: Math.max(0, Math.min(100, posInicial.x + ((ev.clientX - startX) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, posInicial.y + ((ev.clientY - startY) / rect.height) * 100)),
    });

    const mover = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // Um clique ou o pequeno tremor natural da mão nunca reposiciona a caixa.
      // O gesto só vira arraste após segurar brevemente e mover de verdade.
      if (!comecou && (performance.now() - inicioEm < 120 || Math.hypot(dx, dy) < 8)) return;
      if (!comecou) {
        comecou = true;
        arrastando.current = true;
      }
      setPos(calcularPosicao(ev));
    };

    const soltar = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelar);
      if (!comecou) return;
      arrastando.current = false;
      const bruto = calcularPosicao(ev);
      const grudado = grudarNaGrade(bruto.x, bruto.y);
      setPos(grudado);
      onCommit(grudado.x, grudado.y);
    };

    const cancelar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelar);
      arrastando.current = false;
      setPos(posInicial);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
  };

  return (
    <div
      ref={caixaRef}
      className={cn(
        "absolute -translate-y-1/2 select-none",
        alinhamento === "center" && "-translate-x-1/2",
        alinhamento === "right" && "-translate-x-full",
        editable ? "pointer-events-auto touch-none" : "pointer-events-none",
        editable && !arrasteSoPelaAlca && "cursor-move",
      )}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      {...semArraste}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (arrasteSoPelaAlca) return;
        iniciarArraste(e);
      }}
    >
      {typeof children === "function" ? children(iniciarArraste) : children}
    </div>
  );
}

/** Texto desenhado sobre a arte: 1 clique move, 2 cliques edita. */
function TextoEditavel({
  frame,
  comp,
  editable,
  fontePx,
  larguraContainer,
  iniciarArraste,
  onSaveTexto,
  onLargura,
}: {
  frame: Frame;
  comp: Composicao;
  editable: boolean;
  fontePx: number;
  /** Largura da arte em px, base para converter a largura da caixa em %. */
  larguraContainer: number;
  iniciarArraste: (e: React.PointerEvent) => void;
  onSaveTexto: (frameId: string, texto: string) => Promise<void> | void;
  onLargura: (pct: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [editando, setEditando] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [vazio, setVazio] = useState(frame.texto_principal.length === 0);
  const [larguraPct, setLarguraPct] = useState(comp.texto_largura);
  const [ajustando, setAjustando] = useState(false);
  const redimensionando = useRef(false);

  useEffect(() => {
    if (!redimensionando.current) setLarguraPct(comp.texto_largura);
  }, [comp.texto_largura]);

  /** Arrasta a borda da caixa e ajusta a largura, como no Canva. */
  const iniciarResize = (e: React.PointerEvent, lado: "esq" | "dir") => {
    e.preventDefault();
    e.stopPropagation();
    if (!editable || larguraContainer <= 0) return;
    redimensionando.current = true;
    setAjustando(true);
    const alvo = e.currentTarget as HTMLElement;
    try {
      alvo.setPointerCapture(e.pointerId);
    } catch {
      /* navegador sem captura de ponteiro: segue no listener global */
    }
    const x0 = e.clientX;
    const base = larguraPct;
    const fator = comp.texto_alinhamento === "center" ? 2 : 1;
    const calcular = (ev: PointerEvent) => {
      const delta = ((ev.clientX - x0) / larguraContainer) * 100 * (lado === "dir" ? 1 : -1);
      return Math.max(10, Math.min(100, base + delta * fator));
    };
    const mover = (ev: PointerEvent) => setLarguraPct(calcular(ev));
    const soltar = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      redimensionando.current = false;
      setAjustando(false);
      const valor = Math.round(calcular(ev));
      setLarguraPct(valor);
      onLargura(valor);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };

  // Só escreve de fora quando o usuário não está digitando ali.
  useEffect(() => {
    const el = ref.current;
    if (!el || editando) return;
    if (el.innerText.replace(/\n$/, "") !== frame.texto_principal) {
      el.innerText = frame.texto_principal;
    }
    setVazio(frame.texto_principal.length === 0);
  }, [frame.texto_principal, editando]);

  const mostrarPista = !editando && vazio && editable;

  const salvarSaindo = () => {
    const el = ref.current;
    setEditando(false);
    if (!el) return;
    const novo = el.innerText.replace(/\r/g, "").replace(/\n$/, "");
    setVazio(novo.length === 0);
    if (novo !== frame.texto_principal) void onSaveTexto(frame.id, novo);
  };

  const entrarEmEdicao = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    setEditando(true);
    const el = ref.current;
    if (!el) return;
    const x = e.clientX;
    const y = e.clientY;
    requestAnimationFrame(() => {
      el.focus();
      const doc = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
      };
      const sel = window.getSelection();
      if (!sel) return;
      let range: Range | null = null;
      if (typeof doc.caretRangeFromPoint === "function") {
        range = doc.caretRangeFromPoint(x, y);
      } else if (typeof doc.caretPositionFromPoint === "function") {
        const pos = doc.caretPositionFromPoint(x, y);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
        }
      }
      if (!range) {
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    });
  };

  const mostrarAlcas = editable && (editando || sobre || ajustando);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
    >
      {mostrarAlcas ? (
        <button
          type="button"
          aria-label="Mover o texto"
          title="Mover o texto"
          className="absolute -left-3 -top-3 z-10 cursor-move rounded-full bg-background/90 p-1 text-foreground shadow"
          onPointerDown={iniciarArraste}
        >
          <Move className="size-3" />
        </button>
      ) : null}
      <div
        ref={ref}
        lang="pt-BR"
        contentEditable={editable && editando}
        suppressContentEditableWarning
        spellCheck={false}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (!editable || editando) {
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          iniciarArraste(e);
        }}
        onDoubleClick={entrarEmEdicao}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        onInput={(e) => setVazio(e.currentTarget.innerText.replace(/\n$/, "").length === 0)}
        onPaste={(e) => {
          e.preventDefault();
          const texto = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, texto);
        }}
        onBlur={salvarSaindo}
        className={cn(
          "block whitespace-pre-wrap break-normal outline-none",
          "border border-dashed",
          editando ? "cursor-text select-text border-primary border-solid" : "select-none",
          editable && !editando && "cursor-move",
          !editando && (sobre ? "border-primary/60" : "border-transparent"),
        )}
        style={{
          fontFamily: `"${comp.texto_fonte}", sans-serif`,
          hyphens: "none",
          WebkitHyphens: "none",
          overflowWrap: "normal",
          wordBreak: "normal",
          fontWeight: comp.texto_peso,
          fontSize: fontePx,
          lineHeight: 1.2,
          color: comp.texto_cor,
          width: larguraContainer > 0 ? (larguraContainer * larguraPct) / 100 : "auto",
          textAlign: comp.texto_alinhamento,
          minWidth: mostrarPista ? "5em" : "0.5em",
          touchAction: editando ? "auto" : "none",
          textShadow:
            comp.sombra_opacidade > 0
              ? `${fontePx * 0.08}px ${fontePx * 0.08}px ${fontePx * 0.28}px ${corComOpacidade(comp.sombra_cor, comp.sombra_opacidade)}`
              : "none",
        }}
      />
      {mostrarAlcas ? (
        <>
          {(
            [
              { id: "se", lado: "dir", pos: "-bottom-2 -right-2", cursor: "cursor-nwse-resize" },
              { id: "ne", lado: "dir", pos: "-top-2 -right-2", cursor: "cursor-nesw-resize" },
              { id: "so", lado: "esq", pos: "-bottom-2 -left-2", cursor: "cursor-nesw-resize" },
              { id: "no", lado: "esq", pos: "-top-2 -left-2", cursor: "cursor-nwse-resize" },
            ] as const
          ).map((canto) => (
            <span
              key={canto.id}
              role="separator"
              aria-label="Ajustar a largura da caixa de texto"
              title="Ajustar a largura da caixa de texto"
              className={cn(
                "absolute z-20 flex size-4 touch-none items-center justify-center",
                canto.pos,
                canto.cursor,
              )}
              onPointerDown={(e) => iniciarResize(e, canto.lado)}
            >
              <span className="size-2.5 rounded-[3px] border border-background bg-primary shadow" />
            </span>
          ))}
        </>
      ) : null}
      {mostrarPista ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-muted-foreground/60"
          style={{ fontSize: fontePx, lineHeight: 1.2 }}
        >
          Escrever
        </span>
      ) : null}
    </div>
  );
}


export function ArteEditor({
  frame,
  editable,
  podeGerir,
  onSaveComp,
  onSaveTexto,
}: {
  frame: Frame;
  editable: boolean;
  /** Admin e gestor: criam pré-formatações, enviam logos e exportam artes aprovadas. */
  podeGerir: boolean;
  onSaveComp: (frameId: string, patch: Partial<Composicao>) => void;
  onSaveTexto: (frameId: string, texto: string) => Promise<void> | void;
}) {
  const comp = frame.comp;
  const caixaRef = useRef<HTMLDivElement>(null);
  const [altura, setAltura] = useState(0);
  const [largura, setLargura] = useState(0);
  const [grade, setGrade] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { data: logos = [] } = useQuery(logosQueryOptions);

  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const medir = () => {
      setAltura(el.clientHeight);
      setLargura(el.clientWidth);
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const salvar = (patch: Partial<Composicao>) => onSaveComp(frame.id, patch);

  const logo: LogoAsset | null = comp.logo_id
    ? (logos.find((l) => l.id === comp.logo_id) ?? null)
    : null;

  const fontePx = tamanhoFontePx(altura || 1, comp.texto_tamanho);
  const logoProporcao = logo?.svg ? proporcaoDoSvg(logo.svg) : (logo?.proporcao ?? 1);
  const logoDim = dimensoesLogo(largura || 1, altura || 1, comp.logo_tamanho, logoProporcao);

  return (
    <div ref={caixaRef} className="pointer-events-none absolute inset-0">
      {grade ? (
        <div className="absolute inset-0">
          {PONTOS_GRADE.map((p, i) => (
            <span
              key={i}
              className="absolute size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          ))}
        </div>
      ) : null}

      {comp.logo_ativo && logo?.svg ? (
        <div className="pointer-events-none absolute inset-0">
          <Camada
            x={comp.logo_x}
            y={comp.logo_y}
            editable={editable}
            onCommit={(x, y) => salvar({ logo_x: x, logo_y: y })}
          >
            <div
              className="[&_svg]:pointer-events-none [&_svg_*]:pointer-events-none"
              style={{ width: logoDim.largura, height: logoDim.altura }}
              dangerouslySetInnerHTML={{
                __html: svgColorido(logo.svg, comp.logo_cor).replace(
                  /<svg\b/i,
                  '<svg style="width:100%;height:100%;pointer-events:none"',
                ),
              }}
            />
          </Camada>
        </div>
      ) : null}

      {frame.texto_principal.trim().length > 0 || editable ? (
        <div className="pointer-events-none absolute inset-0">
          <Camada
            x={comp.texto_x}
            y={comp.texto_y}
            editable={editable}
            alinhamento={comp.texto_alinhamento}
            arrasteSoPelaAlca
            onCommit={(x, y) => salvar({ texto_x: x, texto_y: y })}
          >
            {(iniciarArraste) => (
              <TextoEditavel
                frame={frame}
                comp={comp}
                editable={editable}
                fontePx={fontePx}
                larguraContainer={largura}
                iniciarArraste={iniciarArraste}
                onSaveTexto={onSaveTexto}
                onLargura={(pct) => salvar({ texto_largura: pct })}
              />
            )}
          </Camada>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute bottom-1 right-1 flex gap-1" {...semArraste}>
        {editable ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Formatar texto"
                  aria-label="Formatar texto da arte"
                  className="rounded-md bg-background/85 p-1 text-foreground shadow hover:bg-background"
                >
                  <Pencil className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(26rem,calc(100vw-2rem))] p-3"
                align="end"
              >
                <PainelTexto
                  comp={comp}
                  editable={editable}
                  podeGerir={podeGerir}
                  salvar={salvar}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Biblioteca de logos"
                  aria-label="Biblioteca de logos"
                  className="rounded-md bg-background/85 p-1 text-foreground shadow hover:bg-background"
                >
                  <Layers className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <PainelLogos
                  comp={comp}
                  editable={editable}
                  podeGerir={podeGerir}
                  salvar={salvar}
                />
              </PopoverContent>
            </Popover>

            <button
              type="button"
              title={grade ? "Esconder grade" : "Mostrar grade"}
              aria-label="Mostrar ou esconder a grade"
              className={cn(
                "rounded-md p-1 shadow",
                grade
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/85 text-foreground hover:bg-background",
              )}
              onClick={() => setGrade((v) => !v)}
            >
              <Grid3X3 className="size-3.5" />
            </button>
          </>
        ) : null}

        {frame.status === "aprovado" ? (
          <button
            type="button"
            title="Exportar arte montada"
            aria-label="Exportar arte montada em PNG"
            className="rounded-md bg-background/85 p-1 text-foreground shadow hover:bg-background"
            disabled={exportando}
            onClick={async () => {
              setExportando(true);
              try {
                await exportarArteMontada(frame, logo?.svg ?? null);
              } catch (erro) {
                toast.error(erro instanceof Error ? erro.message : "Falha ao exportar a arte");
              } finally {
                setExportando(false);
              }
            }}
          >
            {exportando ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
