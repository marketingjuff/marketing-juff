import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * A Marca virou duas telas, Cores e Textos. Esta rota continua existindo
 * de propósito, porque a barra de atalhos guarda destinos e alguém pode
 * ter fixado a Marca lá. Apagar quebraria o atalho dessa pessoa.
 */
export const Route = createFileRoute("/_authenticated/biblioteca/marca")({
  beforeLoad: () => {
    throw redirect({ to: "/biblioteca/cores", replace: true });
  },
});
