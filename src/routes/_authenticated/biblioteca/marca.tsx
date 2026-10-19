import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * A Marca virou duas telas, Cores e Textos. Esta rota continua existindo
 * de propósito, porque a barra de atalhos guarda destinos e alguém pode
 * ter fixado a Marca lá. Apagar quebraria o atalho dessa pessoa.
 */
export const Route = createFileRoute("/_authenticated/biblioteca/marca")({
  head: () => ({ meta: [
    { title: "Marca — Biblioteca — Marketing Juff" },
    { name: "description", content: "Paleta e textos oficiais da marca Juff." },
    { property: "og:title", content: "Marca — Biblioteca — Marketing Juff" },
    { property: "og:description", content: "Paleta e textos oficiais da marca Juff." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/biblioteca/cores", replace: true });
  },
});
