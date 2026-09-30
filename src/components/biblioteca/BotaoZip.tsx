import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderArchive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { coresQueryOptions, medidasQueryOptions, nomeCurto, produtosQueryOptions } from "@/lib/biblioteca";
import { paletaQueryOptions, textosQueryOptions } from "@/lib/biblioteca-marca";
import {
  baixarZip,
  pdfCoresCamiseta,
  pdfMedidasProduto,
  pdfNomesProduto,
  pdfPaleta,
  pdfTextos,
  type ItemZip,
} from "@/lib/biblioteca-pdf";

type Origem = "produtos" | "medidas" | "marca";

function Linha({ marcado, onChange, children, disabled }: { marcado: boolean; onChange: (v: boolean) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox checked={marcado} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
      {children}
    </label>
  );
}

export function BotaoZip({ origem }: { origem: Origem }) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const { data: produtos = [] } = useQuery({ ...produtosQueryOptions, enabled: aberto });
  const [paleta, setPaleta] = useState(false);
  const [textos, setTextos] = useState(false);
  const [coresCam, setCoresCam] = useState(false);
  const [nomes, setNomes] = useState<Set<string>>(new Set());
  const [medidas, setMedidas] = useState<Set<string>>(new Set());

  async function abrir() {
    const lista = await qc.ensureQueryData(produtosQueryOptions).catch(() => []);
    const todos = new Set(lista.map((p) => p.id));
    setPaleta(origem === "marca");
    setTextos(origem === "marca");
    setCoresCam(origem === "produtos");
    setNomes(origem === "produtos" ? todos : new Set());
    setMedidas(origem === "medidas" ? new Set(todos) : new Set());
    setAberto(true);
  }

  const total = (paleta ? 1 : 0) + (textos ? 1 : 0) + (coresCam ? 1 : 0) + nomes.size + medidas.size;

  async function gerar() {
    setGerando(true);
    try {
      const itens: ItemZip[] = [];
      const [cores, pal, txt] = await Promise.all([
        coresCam || nomes.size ? qc.ensureQueryData(coresQueryOptions) : Promise.resolve([]),
        paleta ? qc.ensureQueryData(paletaQueryOptions) : Promise.resolve([]),
        textos ? qc.ensureQueryData(textosQueryOptions) : Promise.resolve([]),
      ]);
      if (paleta) itens.push({ nomeArquivo: "Paleta manual de marca.pdf", blob: pdfPaleta(pal) });
      if (textos) itens.push({ nomeArquivo: "Frases e textos.pdf", blob: pdfTextos(txt) });
      if (coresCam) itens.push({ nomeArquivo: "Cores de camiseta.pdf", blob: pdfCoresCamiseta(cores) });
      for (const p of produtos) {
        if (nomes.has(p.id)) itens.push({ nomeArquivo: `Nomes ${nomeCurto(p)}.pdf`, blob: pdfNomesProduto(p, cores) });
      }
      for (const p of produtos) {
        if (!medidas.has(p.id)) continue;
        const m = await qc.ensureQueryData(medidasQueryOptions(p.id));
        itens.push({ nomeArquivo: `Medidas ${nomeCurto(p)}.pdf`, blob: pdfMedidasProduto(p, m) });
      }
      const d = new Date();
      const data = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
      await baixarZip(`Juff Biblioteca ${data}`, itens);
      setAberto(false);
      toast.success(`${itens.length} ${itens.length === 1 ? "arquivo gerado" : "arquivos gerados"}.`);
    } catch {
      toast.error("Não foi possível gerar o ZIP.");
    } finally {
      setGerando(false);
    }
  }

  function Sublista({ sel, setSel }: { sel: Set<string>; setSel: (s: Set<string>) => void }) {
    return (
      <div className="ml-6 mt-1 space-y-1">
        <div className="flex gap-3 text-xs">
          <button type="button" disabled={gerando} className="text-primary hover:underline" onClick={() => setSel(new Set(produtos.map((p) => p.id)))}>Marcar todos</button>
          <button type="button" disabled={gerando} className="text-muted-foreground hover:underline" onClick={() => setSel(new Set())}>Limpar</button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {produtos.map((p) => (
            <Linha key={p.id} disabled={gerando} marcado={sel.has(p.id)} onChange={(v) => {
              const n = new Set(sel);
              if (v) n.add(p.id); else n.delete(p.id);
              setSel(n);
            }}>{nomeCurto(p)}</Linha>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => void abrir()}>
        <FolderArchive className="size-4" /> Exportar em ZIP
      </Button>
      <Dialog open={aberto} onOpenChange={(v) => { if (!gerando) setAberto(v); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" onInteractOutside={(e) => { if (gerando) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Exportar em ZIP</DialogTitle>
            <DialogDescription>Escolha o que entra no arquivo. Nada vira link público, o arquivo fica com você.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Marca</h3>
              <Linha disabled={gerando} marcado={paleta} onChange={setPaleta}>Paleta do manual de marca</Linha>
              <Linha disabled={gerando} marcado={textos} onChange={setTextos}>Frases e textos prontos</Linha>
            </section>
            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produto</h3>
              <Linha disabled={gerando} marcado={coresCam} onChange={setCoresCam}>Cores de camiseta</Linha>
              <div className="text-sm">Nomes oficiais</div>
              <Sublista sel={nomes} setSel={setNomes} />
            </section>
            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Medidas</h3>
              <div className="text-sm">Tabela de medidas</div>
              <Sublista sel={medidas} setSel={setMedidas} />
            </section>
          </div>
          <DialogFooter className="items-center gap-2 sm:justify-between">
            <span className="text-xs text-muted-foreground">{total} {total === 1 ? "arquivo" : "arquivos"}</span>
            <Button disabled={!total || gerando} onClick={() => void gerar()} className="gap-1">
              {gerando ? <><Loader2 className="size-4 animate-spin" /> Gerando</> : "Gerar ZIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
