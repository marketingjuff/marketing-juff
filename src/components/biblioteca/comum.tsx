import { useEffect, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  criarProduto,
  gerarVariacoes,
  nomeCurto,
  produtosQueryOptions,
  salvarProduto,
  type CorBiblioteca,
  type ProdutoBiblioteca,
} from "@/lib/biblioteca";

const CHAVE = produtosQueryOptions.queryKey;

/** Grava só a diferença, com a tela mudando na hora e voltando atrás se falhar. */
export function patchProdutoOtimista(
  qc: QueryClient,
  id: string,
  patch: Parameters<typeof salvarProduto>[1],
) {
  const antes = qc.getQueryData<ProdutoBiblioteca[]>(CHAVE);
  qc.setQueryData<ProdutoBiblioteca[]>(CHAVE, (l) => l?.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  salvarProduto(id, patch).catch((e: Error) => {
    qc.setQueryData(CHAVE, antes);
    toast.error(`Não foi possível gravar: ${e.message}`);
  });
}

/** Campo que grava ao sair ou após 700ms parado, nunca a cada tecla. */
export function CampoAutoSave({
  valor,
  onSalvar,
  className,
  placeholder,
  inputMode,
  disabled,
}: {
  valor: string;
  onSalvar: (v: string) => void;
  className?: string;
  placeholder?: string;
  inputMode?: "decimal" | "text";
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState(valor);
  const ultimo = useRef(valor);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTexto(valor);
    ultimo.current = valor;
  }, [valor]);

  function gravar(v: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (v === ultimo.current) return;
    ultimo.current = v;
    onSalvar(v);
  }

  return (
    <Input
      value={texto}
      disabled={disabled}
      placeholder={placeholder}
      inputMode={inputMode}
      className={className}
      onChange={(e) => {
        const v = e.target.value;
        setTexto(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => gravar(v), 700);
      }}
      onBlur={() => gravar(texto)}
    />
  );
}

export function ListaProdutos({
  produtos,
  cores,
  selecionado,
  onSelecionar,
  editavel,
}: {
  produtos: ProdutoBiblioteca[];
  cores: CorBiblioteca[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  editavel: boolean;
}) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  async function criar() {
    const nome = novo.trim();
    if (!nome) return;
    try {
      const id = await criarProduto(nome);
      setNovo("");
      setAbrindo(false);
      await qc.invalidateQueries({ queryKey: CHAVE });
      onSelecionar(id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <aside className="md:w-60 md:shrink-0">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {produtos.map((p) => (
          <li key={p.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelecionar(p.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary",
                selecionado === p.id && "bg-primary-soft",
                !p.ativo && "opacity-50",
              )}
            >
              <div className="text-sm font-medium">{nomeCurto(p)}</div>
              <div className="text-xs text-muted-foreground">
                {gerarVariacoes(p, cores).length} variações
              </div>
            </button>
          </li>
        ))}
      </ul>
      {editavel ? (
        abrindo ? (
          <div className="mt-2 flex gap-1">
            <Input
              autoFocus
              value={novo}
              placeholder="Nome base"
              className="h-8"
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void criar();
                if (e.key === "Escape") setAbrindo(false);
              }}
            />
            <Button size="sm" onClick={() => void criar()}>Criar</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="mt-2 gap-1 text-muted-foreground" onClick={() => setAbrindo(true)}>
            <Plus className="size-4" /> Acrescentar produto
          </Button>
        )
      ) : null}
    </aside>
  );
}

export function SemAcesso() {
  return (
    <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      Você não tem acesso à Biblioteca.
    </p>
  );
}

export function Bloco({ titulo, children, acoes }: { titulo: string; children: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{titulo}</h2>
        {acoes}
      </div>
      {children}
    </section>
  );
}

/** Copia e avisa. Usada por Cores e por Textos. */
export async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}
