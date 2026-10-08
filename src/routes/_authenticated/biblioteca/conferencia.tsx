import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Bloco, SemAcesso } from "@/components/biblioteca/comum";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { textoSobreCor } from "@/config/produtos";
import {
  ORDEM_TAMANHOS,
  coresQueryOptions,
  nomeCurto,
  produtosQueryOptions,
  tamanhosOlistQueryOptions,
} from "@/lib/biblioteca";

export const Route = createFileRoute("/_authenticated/biblioteca/conferencia")({
  head: () => ({
    meta: [
      { title: "Conferência de nomes — Biblioteca — Marketing Juff" },
      { name: "description", content: "Compara nomes fantasia e nomes originais da Olist de produtos, cores e tamanhos." },
      { property: "og:title", content: "Conferência de nomes — Biblioteca — Marketing Juff" },
      { property: "og:description", content: "Compara nomes fantasia e nomes originais da Olist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConferenciaPage,
});

const diverge = (f: string, o: string) => !o || f !== o;

function CelOlist({ fantasia, olist }: { fantasia: string; olist: string }) {
  if (!olist) return <td className="px-2 py-1.5 font-semibold text-destructive">Vazio</td>;
  return <td className={cn("px-2 py-1.5", fantasia === olist ? "text-muted-foreground" : "font-semibold text-destructive")}>{olist}</td>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</th>;
}

function ConferenciaPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const pode = hasPermission(profile, "biblioteca.produtos");
  const { data: produtos = [] } = useQuery({ ...produtosQueryOptions, enabled: pode });
  const { data: cores = [] } = useQuery({ ...coresQueryOptions, enabled: pode });
  const { data: tams = [] } = useQuery({ ...tamanhosOlistQueryOptions, enabled: pode });

  if (!pode) return <AppShell><SemAcesso /></AppShell>;

  const linhasProd = produtos.flatMap((p) => {
    const l = [{ id: `${p.id}-b`, pedaco: "Nome base", produto: nomeCurto(p), f: p.nome_base, o: p.nome_base_olist }];
    if (p.usa_tecido) l.push({ id: `${p.id}-t`, pedaco: "Tecido", produto: nomeCurto(p), f: p.tecido, o: p.tecido_olist });
    if (p.usa_sufixo && p.sufixo) l.push({ id: `${p.id}-s`, pedaco: "Sufixo", produto: nomeCurto(p), f: p.sufixo, o: p.sufixo_olist });
    return l;
  });
  const linhasCor = [...cores].sort((a, b) => a.posicao - b.posicao);
  const linhasTam = ORDEM_TAMANHOS.map((t) => ({ t, o: tams.find((x) => x.tamanho === t)?.nome_olist ?? "" }));

  const total =
    linhasProd.filter((l) => diverge(l.f, l.o)).length +
    linhasCor.filter((c) => diverge(c.nome, c.nome_olist)).length +
    linhasTam.filter((l) => diverge(l.t, l.o)).length;

  const linha = (d: boolean) => cn("border-t border-border", d && "bg-destructive/10");

  return (
    <AppShell largura="ampla">
      <div className="space-y-4">
        <p className={cn("text-sm font-medium", total ? "text-destructive" : "text-muted-foreground")}>
          {total
            ? `${total} ${total === 1 ? "divergência encontrada" : "divergências encontradas"} entre nome fantasia e nome original da Olist.`
            : "Os nomes fantasia e os nomes originais da Olist estão iguais em tudo."}
        </p>

        <Bloco titulo="Produtos">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Pedaço</Th><Th>Produto</Th><Th>Nome fantasia</Th><Th>Nome original da Olist</Th></tr></thead>
              <tbody>
                {linhasProd.map((l) => (
                  <tr key={l.id} className={linha(diverge(l.f, l.o))}>
                    <td className="px-2 py-1.5 text-muted-foreground">{l.pedaco}</td>
                    <td className="px-2 py-1.5">{l.produto}</td>
                    <td className="px-2 py-1.5">{l.f}</td>
                    <CelOlist fantasia={l.f} olist={l.o} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloco>

        <Bloco titulo="Cores">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Cor</Th><Th>Nome fantasia</Th><Th>Nome original da Olist</Th></tr></thead>
              <tbody>
                {linhasCor.map((c) => (
                  <tr key={c.id} className={linha(diverge(c.nome, c.nome_olist))}>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs" style={{ backgroundColor: c.hex, color: textoSobreCor(c.hex) }}>{c.hex}</span>
                    </td>
                    <td className="px-2 py-1.5">{c.nome}</td>
                    <CelOlist fantasia={c.nome} olist={c.nome_olist} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloco>

        <Bloco titulo="Tamanhos">
          <table className="w-full text-sm">
            <thead><tr><Th>Nome fantasia</Th><Th>Nome original da Olist</Th></tr></thead>
            <tbody>
              {linhasTam.map((l) => (
                <tr key={l.t} className={linha(diverge(l.t, l.o))}>
                  <td className="px-2 py-1.5">{l.t}</td>
                  <CelOlist fantasia={l.t} olist={l.o} />
                </tr>
              ))}
            </tbody>
          </table>
        </Bloco>
      </div>
    </AppShell>
  );
}
