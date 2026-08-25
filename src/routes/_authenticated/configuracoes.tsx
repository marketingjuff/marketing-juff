import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Trash2, UserPlus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PERMISSION_CATALOG, READONLY_SUFFIX } from "@/config/navigation";
import { profileQueryOptions, type AppRole } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  listUsers,
  setUserPassword,
  updatePermissions,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Marketing Juff" },
      {
        name: "description",
        content: "Gerencie contas, papéis e permissões de acesso do Marketing Juff.",
      },
      { property: "og:title", content: "Configurações — Marketing Juff" },
      {
        property: "og:description",
        content: "Gerencie contas, papéis e permissões de acesso do Marketing Juff.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Configuracoes,
});

type PermState = Record<string, "nenhum" | "edicao" | "leitura">;

function permsToState(permissions: string[]): PermState {
  const state: PermState = {};
  for (const item of PERMISSION_CATALOG) {
    if (permissions.includes(item.key)) state[item.key] = "edicao";
    else if (permissions.includes(`${item.key}${READONLY_SUFFIX}`)) state[item.key] = "leitura";
    else state[item.key] = "nenhum";
  }
  return state;
}

function stateToPerms(state: PermState): string[] {
  return Object.entries(state)
    .filter(([, value]) => value !== "nenhum")
    .map(([key, value]) => (value === "edicao" ? key : `${key}${READONLY_SUFFIX}`));
}

function PermissionPanel({
  state,
  onChange,
}: {
  state: PermState;
  onChange: (next: PermState) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Permissões por aba
      </p>
      {PERMISSION_CATALOG.map((item) => {
        const value = state[item.key] ?? "nenhum";
        return (
          <div key={item.key} className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value !== "nenhum"}
                onCheckedChange={(checked) =>
                  onChange({ ...state, [item.key]: checked ? "edicao" : "nenhum" })
                }
              />
              {item.label}
            </label>
            {value !== "nenhum" ? (
              <Select
                value={value}
                onValueChange={(next) =>
                  onChange({ ...state, [item.key]: next as PermState[string] })
                }
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edicao">Edição</SelectItem>
                  <SelectItem value="leitura">Só leitura</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Configuracoes() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const isAdmin = profile?.role === "admin";
  const queryClient = useQueryClient();

  const fetchUsers = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const updatePerms = useServerFn(updatePermissions);
  const setPassword = useServerFn(setUserPassword);
  const removeUser = useServerFn(deleteUser);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers({ data: undefined }),
    enabled: isAdmin,
  });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<AppRole>("operador");
  const [perms, setPerms] = useState<PermState>(permsToState([]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const createMutation = useMutation({
    mutationFn: () =>
      create({ data: { nome, email, senha, role, permissions: stateToPerms(perms) } }),
    onSuccess: () => {
      toast.success("Conta criada");
      setNome("");
      setEmail("");
      setSenha("");
      setRole("operador");
      setPerms(permsToState([]));
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin && profile?.role !== "gestor") {
    return (
      <AppShell>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Você não tem acesso às configurações.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Usuários e permissões do sistema."
              : "Seção de usuários visível apenas para admin."}
          </p>
        </div>

        {isAdmin ? (
          <>
            <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <UserPlus className="size-4 text-primary" /> Criar conta
              </h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha">Senha inicial</Label>
                    <Input
                      id="senha"
                      required
                      minLength={8}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Papel</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="operador">Operador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {role !== "admin" ? (
                  <PermissionPanel state={perms} onChange={setPerms} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Admin enxerga e faz tudo, sem precisar de permissão marcada.
                  </p>
                )}

                <Button type="submit" disabled={createMutation.isPending}>
                  Criar conta
                </Button>
              </form>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">Contas do sistema</h2>
              {(usersQuery.data ?? []).map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onSavePerms={async (nextRole, permissions) => {
                    await updatePerms({ data: { userId: user.id, role: nextRole, permissions } });
                    toast.success("Permissões atualizadas");
                    invalidate();
                  }}
                  onSetPassword={async (novaSenha) => {
                    await setPassword({ data: { userId: user.id, senha: novaSenha } });
                    toast.success("Senha redefinida — o usuário terá que trocá-la no próximo login");
                    invalidate();
                  }}
                  onDelete={async () => {
                    await removeUser({ data: { userId: user.id } });
                    toast.success("Conta excluída");
                    invalidate();
                  }}
                />
              ))}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

type UserRowData = {
  id: string;
  nome: string;
  email: string;
  role: string;
  permissions: string[];
  must_change_password: boolean;
};

function UserRow({
  user,
  onSavePerms,
  onSetPassword,
  onDelete,
}: {
  user: UserRowData;
  onSavePerms: (role: AppRole, permissions: string[]) => Promise<void>;
  onSetPassword: (senha: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [role, setRole] = useState<AppRole>(user.role as AppRole);
  const [perms, setPerms] = useState<PermState>(permsToState(user.permissions ?? []));
  const [novaSenha, setNovaSenha] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{user.nome}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        {user.must_change_password ? (
          <span className="rounded-full border border-warning bg-warning/20 px-2 py-0.5 text-[11px]">
            Precisa trocar a senha
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Papel</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="operador">Operador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Definir nova senha</Label>
          <div className="flex gap-2">
            <Input
              value={novaSenha}
              minLength={8}
              placeholder="mínimo 8 caracteres"
              onChange={(e) => setNovaSenha(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busy || novaSenha.length < 8}
              onClick={() => run(async () => onSetPassword(novaSenha)).then(() => setNovaSenha(""))}
              aria-label="Redefinir senha"
            >
              <KeyRound className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {role !== "admin" ? (
        <div className="mt-3">
          <PermissionPanel state={perms} onChange={setPerms} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => run(() => onSavePerms(role, stateToPerms(perms)))}
        >
          Salvar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-destructive"
          disabled={busy}
          onClick={() => run(onDelete)}
        >
          <Trash2 className="size-4" /> Excluir conta
        </Button>
      </div>
    </div>
  );
}
