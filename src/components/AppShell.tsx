import { SinoNotificacoes } from "@/components/SinoNotificacoes";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { BarraAtalhos } from "@/components/tarefas/BarraAtalhos";
import { arrastavel } from "@/lib/atalhos-paginas";
import { useAvancarRecorrentes } from "@/hooks/useAvancarRecorrentes";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LogOut, Megaphone, Library, Settings, SquareKanban, Telescope, User } from "lucide-react";
import type { ReactNode } from "react";

import { NAVIGATION } from "@/config/navigation";
import { hasPermission, profileQueryOptions } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import juffLogo from "@/assets/juff-logo.png.asset.json";

const ICONES_MASTER = {
  megaphone: Megaphone,
  "square-kanban": SquareKanban,
  telescope: Telescope,
  library: Library,
} as const;

export function AppShell({
  children,
  largura = "padrao",
}: {
  children: ReactNode;
  /** "ampla" aproveita melhor monitores grandes. */
  largura?: "padrao" | "ampla";
}) {
  void largura;
  /** Mesma largura em todas as telas, para o topo não pular ao trocar de aba. */
  const larguraClasse = "max-w-[110rem]";
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const router = useRouter();
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const podeQuadros = hasPermission(profile, "tarefas.quadros");
  useAvancarRecorrentes(podeQuadros);

  /**
   * Aba mestre em que a pessoa está, descoberta pelo caminho atual.
   * Telas fora da navegação, como Configurações e Trocar senha,
   * não pertencem a nenhuma aba mestre e ficam sem segunda linha.
   */
  const masterAtiva = NAVIGATION.find((master) =>
    master.subTabs.some((sub) => caminho === sub.to || caminho.startsWith(`${sub.to}/`)),
  );

  /** Sub abas que a pessoa pode enxergar dentro da aba mestre ativa. */
  const subTabsVisiveis = (masterAtiva?.subTabs ?? []).filter(
    (sub) =>
      (!sub.roles || (profile ? sub.roles.includes(profile.role) : false)) &&
      hasPermission(profile, sub.permission),
  );

  /**
   * Com uma sub aba só, a linha inteira some.
   * Uma linha para mostrar um item já selecionado não informa nada.
   */
  const mostrarSubTabs = subTabsVisiveis.length > 1;

  const canOpenSettings = !!profile;

  async function sair() {
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className={cn("mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-2 lg:flex lg:h-14 lg:gap-4 lg:px-4 lg:py-0", larguraClasse)}>
          <div className="flex min-w-0 items-center gap-2 lg:shrink-0">
            <img
              src={juffLogo.url}
              alt="Logotipo Juff"
              className="size-7 rounded-md object-cover"
            />
            <span className="min-w-0 truncate text-sm font-semibold">
              Marketing Juff
              <span className="hidden font-normal text-muted-foreground xl:inline">
                {" "}
                — Comunicação e conteúdo
              </span>
            </span>
          </div>

          <nav aria-label="Abas principais" className="col-span-2 row-start-2 min-w-0 lg:flex lg:flex-1 lg:justify-center">
            <ul className="grid grid-cols-2 items-center gap-1 rounded-xl bg-secondary/60 p-1 sm:grid-cols-4 lg:flex">
              {NAVIGATION.map((master) => {
                const primeiro = master.subTabs.find(
                  (sub) =>
                    (!sub.roles || (profile ? sub.roles.includes(profile.role) : false)) &&
                    hasPermission(profile, sub.permission),
                );
                if (!primeiro) return null;
                const IconeMaster = ICONES_MASTER[master.icone];
                return (
                  <li key={master.key} className="min-w-0">
                    {primeiro ? (
                      <Link
                        to={primeiro.to}
                        {...arrastavel(primeiro.to, master.label)}
                        className="flex min-h-9 items-center justify-center rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground lg:px-4"
                        style={masterAtiva?.key === master.key ? { background: master.cor, color: "#ffffff" } : undefined}
                        activeProps={{ className: masterAtiva?.key === master.key ? "shadow-soft" : "" }}
                        activeOptions={{ exact: false }}
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <IconeMaster className="size-3.5 shrink-0" />
                          {master.label}
                        </span>
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-0 lg:gap-1">
            <SinoNotificacoes />
            {canOpenSettings ? (
              <Button variant="ghost" size="sm" className="gap-2 px-2 lg:px-3" asChild>
                <Link to="/configuracoes" aria-label="Configurações" title="Configurações">
                  <Settings className="size-4" />
                  <span className="hidden xl:inline">Configurações</span>
                </Link>
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2 lg:px-3" aria-label="Minha conta" title="Minha conta">
                  <User className="size-4" />
                  <span className="hidden max-w-[8rem] truncate xl:inline">{profile?.nome}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="truncate text-sm font-medium">{profile?.nome}</div>
                  <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
                  <div className="mt-1 text-xs capitalize text-muted-foreground">
                    {profile?.role}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/trocar-senha" className="flex items-center gap-2">
                    <User className="size-4" /> Trocar minha senha
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" className="gap-2 px-2 lg:px-3" onClick={sair} aria-label="Sair" title="Sair">
              <LogOut className="size-4" />
              <span className="hidden xl:inline">Sair</span>
            </Button>
          </div>
        </div>

        {mostrarSubTabs ? (
          <nav aria-label="Abas da seção" className={cn("mx-auto min-w-0 border-t border-border px-3 lg:px-4", larguraClasse)}>
            <ul className="flex flex-wrap items-center gap-1 py-2">
              {subTabsVisiveis.map((sub) => {
                const allowed = hasPermission(profile, sub.permission);
                if (!allowed) return null;
                return (
                  <li key={sub.key} className="min-w-0">
                    <Link
                      to={sub.to}
                      {...arrastavel(sub.to, sub.label)}
                      className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-primary-soft text-foreground font-medium" }}
                    >
                      {sub.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}


        <div className={cn("mx-auto border-t border-border px-4", larguraClasse)}>
          <BarraAtalhos />
        </div>
      </header>


      <main className={cn("mx-auto px-4 py-5", larguraClasse)}>{children}</main>
    </div>
  );
}
