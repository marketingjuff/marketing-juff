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

export function AppShell({ children }: { children: ReactNode }) {
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
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <img
              src={juffLogo.url}
              alt="Logotipo Juff"
              className="size-7 rounded-md object-cover"
            />
            <span className="text-base font-semibold tracking-tight">Marketing Juff</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="size-4" />
                <span className="hidden max-w-[10rem] truncate sm:inline">{profile?.nome}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">{profile?.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
                <div className="mt-1 text-xs capitalize text-muted-foreground">{profile?.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canOpenSettings ? (
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes" className="flex items-center gap-2">
                    <Settings className="size-4" /> Configurações
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link to="/trocar-senha" className="flex items-center gap-2">
                  <User className="size-4" /> Trocar minha senha
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={sair} className="flex items-center gap-2">
                <LogOut className="size-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="mx-auto max-w-7xl overflow-x-auto px-4">
          <ul className="flex items-end gap-1">
            {NAVIGATION.map((master) => {
              const enabled = master.subTabs.some(
                (sub) =>
                  (!sub.roles || (profile ? sub.roles.includes(profile.role) : false)) &&
                  hasPermission(profile, sub.permission),
              );
              return (
                <li key={master.key}>
                  <span
                    className={cn(
                      "inline-block border-b-2 px-3 pb-2 text-xs font-semibold tracking-widest",
                      enabled
                        ? "border-primary text-foreground"
                        : "cursor-not-allowed border-transparent text-muted-foreground/50",
                    )}
                  >
                    {master.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mx-auto max-w-7xl overflow-x-auto border-t border-border px-4">
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

      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
