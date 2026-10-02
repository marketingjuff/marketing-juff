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
  const larguraClasse = largura === "ampla" ? "max-w-[110rem]" : "max-w-7xl";
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
    (sub) => !sub.roles || (profile ? sub.roles.includes(profile.role) : false),
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
        <div className={cn("mx-auto flex h-14 items-center gap-4 px-4", larguraClasse)}>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <img
              src={juffLogo.url}
              alt="Logotipo Juff"
              className="size-7 rounded-md object-cover"
            />
            <span className="truncate text-sm font-semibold tracking-tight">
              Marketing Juff
              <span className="hidden font-normal text-muted-foreground md:inline">
                {" "}
                — Comunicação e conteúdo
              </span>
            </span>
          </div>

          <nav className="flex flex-1 justify-center overflow-x-auto">
            <ul className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
              {NAVIGATION.map((master) => {
                const primeiro = master.subTabs.find(
                  (sub) =>
                    (!sub.roles || (profile ? sub.roles.includes(profile.role) : false)) &&
                    hasPermission(profile, sub.permission),
                );
                const IconeMaster = ICONES_MASTER[master.icone];
                return (
                  <li key={master.key}>
                    {primeiro ? (
                      <Link
                        to={primeiro.to}
                        {...arrastavel(primeiro.to, master.label)}
                        className="inline-block rounded-lg px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                        style={masterAtiva?.key === master.key ? { background: master.cor, color: "#ffffff" } : undefined}
                        activeProps={masterAtiva?.key === master.key ? { className: "shadow-soft" } : undefined}
                        activeOptions={{ exact: false }}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <IconeMaster className="size-3.5" />
                          {master.label}
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-block cursor-not-allowed rounded-lg px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground/40">
                        <span className="inline-flex items-center gap-1.5">
                          <IconeMaster className="size-3.5" />
                          {master.label}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <SinoNotificacoes />
            {canOpenSettings ? (
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <Link to="/configuracoes">
                  <Settings className="size-4" />
                  <span className="hidden sm:inline">Configurações</span>
                </Link>
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="size-4" />
                  <span className="hidden max-w-[8rem] truncate lg:inline">{profile?.nome}</span>
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

            <Button variant="ghost" size="sm" className="gap-2" onClick={sair}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {mostrarSubTabs ? (
          <div className={cn("mx-auto overflow-x-auto border-t border-border px-4", larguraClasse)}>
            <ul className="flex items-center gap-1 py-2">
              {subTabsVisiveis.map((sub) => {
                const allowed = hasPermission(profile, sub.permission);
                if (!allowed) {
                  return (
                    <li key={sub.key}>
                      <span className="rounded-md px-3 py-1.5 text-sm text-muted-foreground/50">
                        {sub.label}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={sub.key}>
                    <Link
                      to={sub.to}
                      {...arrastavel(sub.to, sub.label)}
                      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-primary-soft text-foreground font-medium" }}
                    >
                      {sub.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}


        <div className={cn("mx-auto border-t border-border px-4", larguraClasse)}>
          <BarraAtalhos />
        </div>
      </header>


      <main className={cn("mx-auto px-4 py-5", larguraClasse)}>{children}</main>
    </div>
  );
}
