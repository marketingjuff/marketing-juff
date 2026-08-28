import { Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LogOut, Settings, User } from "lucide-react";
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

  const canOpenSettings = profile?.role === "admin" || profile?.role === "gestor";

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
                return (
                  <li key={master.key}>
                    {primeiro ? (
                      <Link
                        to={primeiro.to}
                        className="inline-block rounded-lg px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                        activeProps={{ className: "bg-primary text-primary-foreground shadow-soft" }}
                        activeOptions={{ exact: false }}
                      >
                        {master.label}
                      </Link>
                    ) : (
                      <span className="inline-block cursor-not-allowed rounded-lg px-4 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground/40">
                        {master.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-1">
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

        <div className={cn("mx-auto overflow-x-auto border-t border-border px-4", larguraClasse)}>
          <ul className="flex items-center gap-1 py-2">
            {NAVIGATION.flatMap((master) => master.subTabs).map((sub) => {
              const roleOk = !sub.roles || (profile ? sub.roles.includes(profile.role) : false);
              const allowed = roleOk && hasPermission(profile, sub.permission);
              if (!roleOk) return null;
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
      </header>


      <main className={cn("mx-auto px-4 py-5", larguraClasse)}>{children}</main>
    </div>
  );
}
