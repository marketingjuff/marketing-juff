import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  LayoutGrid,
  Library,
  Link2,
  MessageSquareQuote,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Bell,
  CalendarClock,
  Telescope,
  Trash2,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PainelEtiquetas } from "@/components/config/PainelEtiquetas";
import { PainelMeuDia } from "@/components/config/PainelMeuDia";
import { PainelCamposEstrategia } from "@/components/config/PainelCamposEstrategia";
import { PainelNotificacoes } from "@/components/config/PainelNotificacoes";
import { PainelCoresProduto } from "@/components/config/PainelCoresProduto";
import { CORES_ETIQUETA, etiquetasQueryOptions, quadrosDoUsuarioQueryOptions, quadrosQueryOptions, setQuadrosDoUsuario, siglaPessoa } from "@/lib/tarefas";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  PERMISSION_CATALOG,
  PRESETS,
  gruposDePermissao,
  niveisPermissoes,
  permissoesDoGrupo,
  serializarPermissao,
  type NivelAcesso,
  modoDaPermissao,
} from "@/config/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CTA_GRUPOS,
  createCta,
  createLink,
  ctasQueryOptions,
  deleteCta,
  deleteLink,
  linksQueryOptions,
  updateCta,
  updateLink,
  type Cta,
  type LinkCta,
} from "@/lib/story-ctas";
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

type SecaoConfig = {
  key: string;
  label: string;
  icone: LucideIcon;
  subtitulo: string;
  /** Quando definido, só estes papéis enxergam a seção. */
  roles?: AppRole[];
};

const SECOES: SecaoConfig[] = [
  { key: "geral", label: "Geral", icone: Settings, subtitulo: "Sua conta e um resumo do sistema." },
  { key: "social", label: "Social", icone: Sparkles, subtitulo: "Frases de CTA e links usados nos stories." },
  { key: "tarefas", label: "Tarefas", icone: LayoutGrid, subtitulo: "Etiquetas usadas nos cards de todos os quadros." },
  { key: "meu_dia", label: "Meu dia", icone: CalendarClock, subtitulo: "Seus recorrentes e os feriados da Juff." },
  { key: "estrategia", label: "Estratégia", icone: Telescope, subtitulo: "Campos da ata mensal de cada frente." },
  { key: "biblioteca", label: "Biblioteca", icone: Library, subtitulo: "Cores oficiais de camiseta usadas nos produtos.", roles: ["admin"] },
  { key: "notificacoes", label: "Notificações", icone: Bell, subtitulo: "O que você quer receber no sininho." },
  { key: "usuarios", label: "Usuários e permissões", icone: Users, subtitulo: "Contas, papéis e permissões de acesso." },
];

type PermState = Record<string, "nenhum" | "edicao" | "leitura">;

function permsToState(permissions: string[]): PermState {
  const niveis = niveisPermissoes(permissions);
  const state: PermState = {};
  for (const item of PERMISSION_CATALOG) {
    const nivel = niveis.get(item.key);
    state[item.key] = nivel ?? "nenhum";
  }
  return state;
}

function stateToPerms(state: PermState): string[] {
  return Object.entries(state)
    .filter(([, value]) => value !== "nenhum")
    .map(([key, value]) => serializarPermissao(key, value as NivelAcesso));
}

function PermissionPanel({
  state,
  onChange,
}: {
  state: PermState;
  onChange: (next: PermState) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(permsToState(preset.permissoes))}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-left transition-colors hover:border-primary"
            >
              <span className="block text-sm font-medium">{preset.label}</span>
              <span className="block text-[11px] text-muted-foreground">{preset.descricao}</span>
            </button>
          ))}
        </div>
      </div>

      {gruposDePermissao().map((grupo) => (
        <div key={grupo} className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {grupo}
          </p>
          {permissoesDoGrupo(grupo).map((item) => {
            const value = state[item.key] ?? "nenhum";
            const modo = modoDaPermissao(item.key);
            const opcoes: { v: PermState[string]; label: string }[] =
              modo === "tres"
                ? [
                    { v: "nenhum", label: "Sem acesso" },
                    { v: "leitura", label: "Somente leitura" },
                    { v: "edicao", label: "Edição" },
                  ]
                : modo === "ver"
                  ? [
                      { v: "nenhum", label: "Sem acesso" },
                      { v: "edicao", label: "Ver" },
                    ]
                  : [
                      { v: "nenhum", label: "Sem acesso" },
                      { v: "edicao", label: "Edição" },
                    ];
            return (
              <div key={item.key} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm">{item.label}</span>
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={value === "leitura" && modo !== "tres" ? "edicao" : value}
                  onValueChange={(v) => {
                    if (v) onChange({ ...state, [item.key]: v as PermState[string] });
                  }}
                >
                  {opcoes.map((o) => (
                    <ToggleGroupItem key={o.v} value={o.v} className="h-7 px-2 text-xs">
                      {o.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            );
          })}
        </div>
      ))}
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

  const isGestor = profile?.role === "gestor";
  const podeUsuarios = isAdmin || isGestor;
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers({ data: undefined }),
    enabled: podeUsuarios,
  });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<AppRole>("operador");
  const [perms, setPerms] = useState<PermState>(permsToState([]));
  const [secao, setSecao] = useState<string>(SECOES[0]!.key);
  const { data: etiquetasAtivas } = useQuery(etiquetasQueryOptions);
  const { data: quadrosAtivos } = useQuery(quadrosQueryOptions);

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

  const secoesVisiveis = SECOES.filter((s) => !s.roles || (profile && s.roles.includes(profile.role)));
  const secaoAtual = secoesVisiveis.find((s) => s.key === secao) ?? secoesVisiveis[0]!;
  const contador = (key: string): number | null =>
    key === "tarefas" ? (etiquetasAtivas?.length ?? null) : key === "usuarios" ? (usersQuery.data?.length ?? null) : null;

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            {secaoAtual.key === "usuarios" && isGestor
              ? "Operadores que você administra e suas permissões."
              : secaoAtual.subtitulo}
          </p>
        </div>

        <div className="flex flex-col gap-5 md:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-60 md:flex-col md:overflow-visible">
            {secoesVisiveis.map((s) => {
              const Icone = s.icone;
              const n = contador(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSecao(s.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary",
                    s.key === secaoAtual.key && "bg-primary-soft font-medium text-foreground",
                  )}
                >
                  <Icone className="size-4 shrink-0" />
                  <span className="flex-1 whitespace-nowrap">{s.label}</span>
                  {n != null ? <span className="text-xs tabular-nums text-muted-foreground">{n}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1 space-y-5">
        {secaoAtual.key === "geral" ? (
          <>
            <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h2 className="text-base font-semibold">Minha conta</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div><dt className="text-muted-foreground">Nome</dt><dd className="font-medium">{profile?.nome}</dd></div>
                <div><dt className="text-muted-foreground">E-mail</dt><dd className="font-medium">{profile?.email}</dd></div>
                <div><dt className="text-muted-foreground">Papel</dt><dd className="font-medium capitalize">{profile?.role}</dd></div>
              </dl>
              <Button asChild size="sm" variant="outline" className="mt-3 gap-1">
                <Link to="/trocar-senha"><KeyRound className="size-4" /> Trocar minha senha</Link>
              </Button>
            </section>
            <section className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Pessoas com acesso", valor: usersQuery.data?.length },
                { label: "Quadros ativos", valor: quadrosAtivos?.length },
                { label: "Etiquetas ativas", valor: etiquetasAtivas?.length },
              ].map((r) => (
                <div key={r.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                  <p className="text-2xl font-semibold tabular-nums">{r.valor ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{r.label}</p>
                </div>
              ))}
            </section>
          </>
        ) : null}

        {secaoAtual.key === "social" ? (
          <>
            <PainelCtas />
            <PainelLinks />
          </>
        ) : null}

        {secaoAtual.key === "tarefas" ? <PainelEtiquetas /> : null}
        {secaoAtual.key === "meu_dia" ? <PainelMeuDia /> : null}
        {secaoAtual.key === "estrategia" ? <PainelCamposEstrategia /> : null}
        {secaoAtual.key === "biblioteca" ? <PainelCoresProduto /> : null}
        {secaoAtual.key === "notificacoes" ? <PainelNotificacoes /> : null}

        {secaoAtual.key === "usuarios" && podeUsuarios ? (
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
                    <Select
                      value={isGestor ? "operador" : role}
                      disabled={isGestor}
                      onValueChange={(v) => setRole(v as AppRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isAdmin ? <SelectItem value="admin">Admin</SelectItem> : null}
                        {isAdmin ? <SelectItem value="gestor">Gestor</SelectItem> : null}
                        <SelectItem value="operador">Operador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {role !== "admin" || isGestor ? (
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
              <h2 className="text-base font-semibold">
                {isGestor ? "Operadores" : "Contas do sistema"}
              </h2>
              {(usersQuery.data ?? []).map((user) => (
                <UserRow
                  key={user.id}
                  travarOperador={isGestor}
                  podeQuadros={isAdmin}
                  user={user}
                  onSavePerms={async (nextRole, permissions, identidade) => {
                    await updatePerms({
                      data: {
                        userId: user.id,
                        role: nextRole,
                        permissions,
                        nome: identidade.nome,
                        sigla: identidade.sigla,
                        cor_avatar: identidade.cor_avatar,
                        cor_texto_avatar: identidade.cor_texto_avatar,
                      },
                    });
                    toast.success("Conta atualizada");
                    invalidate();
                    queryClient.invalidateQueries({ queryKey: ["tarefas", "pessoas"] });
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
        </div>
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
  sigla: string | null;
  cor_avatar: string | null;
  cor_texto_avatar: string | null;
};

function UserRow({
  user,
  travarOperador = false,
  podeQuadros = false,
  onSavePerms,
  onSetPassword,
  onDelete,
}: {
  user: UserRowData;
  travarOperador?: boolean;
  podeQuadros?: boolean;
  onSavePerms: (
    role: AppRole,
    permissions: string[],
    identidade: { nome: string; sigla: string; cor_avatar: string | null; cor_texto_avatar: string | null },
  ) => Promise<void>;
  onSetPassword: (senha: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [role, setRole] = useState<AppRole>(user.role as AppRole);
  const [perms, setPerms] = useState<PermState>(permsToState(user.permissions ?? []));
  const [novaSenha, setNovaSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [sigla, setSigla] = useState(user.sigla ?? "");
  const [nome, setNome] = useState(user.nome);
  const [corAvatar, setCorAvatar] = useState(user.cor_avatar ?? "#378add");
  const [corTextoAvatar, setCorTextoAvatar] = useState(user.cor_texto_avatar ?? "#ffffff");
  const siglaMostrada = siglaPessoa({ nome: user.nome, sigla });

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
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold leading-none tracking-tight"
            style={{ backgroundColor: corAvatar, color: corTextoAvatar }}
            title={`Bolinha de ${user.nome}`}
          >
            {siglaMostrada}
          </span>
          <div className="space-y-1">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-8 w-56 text-sm font-medium"
              aria-label="Nome da pessoa"
            />
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
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
          <Select
            value={role}
            disabled={travarOperador}
            onValueChange={(v) => setRole(v as AppRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!travarOperador ? <SelectItem value="admin">Admin</SelectItem> : null}
              {!travarOperador ? <SelectItem value="gestor">Gestor</SelectItem> : null}
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Bolinha nos cards</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={sigla}
              maxLength={3}
              spellCheck={false}
              placeholder={siglaPessoa({ nome: user.nome, sigla: null })}
              aria-label="Sigla de até três caracteres"
              className="h-8 w-20 text-center font-mono text-xs uppercase"
              onChange={(e) => setSigla(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3))}
            />
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Fundo
              <ColorPicker
                value={corAvatar}
                onChange={setCorAvatar}
                label="Cor do fundo da bolinha"
                presets={CORES_ETIQUETA}
              />
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Texto
              <ColorPicker
                value={corTextoAvatar}
                onChange={setCorTextoAvatar}
                label="Cor do texto da bolinha"
                presets={["#ffffff", "#111111", ...CORES_ETIQUETA]}
              />
            </span>
            {role !== "admin" ? (
              <PermissoesDialog
                user={user}
                perms={perms}
                onApply={setPerms}
                podeQuadros={podeQuadros}
              />
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Até três caracteres. Deixando em branco, o sistema monta a sigla pelo nome.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            run(() =>
              onSavePerms(role, stateToPerms(perms), {
                nome: nome.trim() || user.nome,
                sigla,
                cor_avatar: corAvatar,
                cor_texto_avatar: corTextoAvatar,
              }),
            )
          }
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

function PainelCtas() {
  const queryClient = useQueryClient();
  const { data: ctas = [] } = useQuery(ctasQueryOptions);
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState<string>(CTA_GRUPOS[0]);
  const [editando, setEditando] = useState<Cta | null>(null);
  const [salvando, setSalvando] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["story-ctas"] });

  function limpar() {
    setTexto("");
    setGrupo(CTA_GRUPOS[0]);
    setEditando(null);
  }

  async function salvar() {
    const frase = texto.trim();
    if (!frase) return;
    setSalvando(true);
    try {
      if (editando) await updateCta(editando.id, { texto: frase, grupo });
      else await createCta(frase, grupo);
      toast.success(editando ? "CTA atualizado" : "CTA cadastrado");
      limpar();
      invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <MessageSquareQuote className="size-4 text-primary" /> Frases de CTA
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Frases usadas no botão do story dentro do Meta Business Suite. São elas que aparecem na
        lista suspensa de cada arte e no PDF enviado para a análise do plano.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
        <Input
          value={texto}
          placeholder="Frase do CTA"
          onChange={(e) => setTexto(e.target.value)}
        />
        <Select value={grupo} onValueChange={setGrupo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CTA_GRUPOS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            className="gap-1"
            disabled={salvando || texto.trim().length === 0}
            onClick={salvar}
          >
            {editando ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editando ? "Salvar" : "Adicionar"}
          </Button>
          {editando ? (
            <Button variant="ghost" className="gap-1" onClick={limpar}>
              <X className="size-4" /> Cancelar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {ctas.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border p-2"
          >
            <div className="min-w-0">
              <p
                className={cn("truncate text-sm", c.arquivado && "text-muted-foreground line-through")}
              >
                {c.texto}
              </p>
              <p className="text-[11px] text-muted-foreground">{c.grupo}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditando(c);
                  setTexto(c.texto);
                  setGrupo(c.grupo);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                title={c.arquivado ? "Reativar" : "Arquivar"}
                onClick={async () => {
                  await updateCta(c.id, { arquivado: !c.arquivado });
                  invalidate();
                }}
              >
                {c.arquivado ? "Reativar" : "Arquivar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!window.confirm(`Excluir a frase "${c.texto}"?`)) return;
                  await deleteCta(c.id);
                  toast.success("CTA excluído");
                  invalidate();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {ctas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma frase cadastrada ainda.</p>
        ) : null}
      </div>
    </section>
  );
}

function PainelLinks() {
  const queryClient = useQueryClient();
  const { data: links = [] } = useQuery(linksQueryOptions);
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editando, setEditando] = useState<LinkCta | null>(null);
  const [salvando, setSalvando] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["story-links"] });

  function limpar() {
    setNome("");
    setUrl("");
    setDescricao("");
    setEditando(null);
  }

  async function salvar() {
    if (!nome.trim() || !url.trim()) return;
    setSalvando(true);
    try {
      if (editando) await updateLink(editando.id, { nome, url, descricao });
      else await createLink(nome, url, descricao);
      toast.success(editando ? "Link atualizado" : "Link cadastrado");
      limpar();
      invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Link2 className="size-4 text-primary" /> Links de destino
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Endereços que podem ser ligados a um CTA. O campo de orientação explica quando cada link
        deve ser usado e é essa explicação que vai no PDF para a análise do plano escolher certo.
      </p>

      <div className="mt-3 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={nome}
            placeholder="Nome do link"
            onChange={(e) => setNome(e.target.value)}
          />
          <Input value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)} />
        </div>
        <Textarea
          value={descricao}
          rows={2}
          placeholder="Quando usar este link"
          onChange={(e) => setDescricao(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            className="gap-1"
            disabled={salvando || nome.trim().length === 0 || url.trim().length === 0}
            onClick={salvar}
          >
            {editando ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editando ? "Salvar" : "Adicionar"}
          </Button>
          {editando ? (
            <Button variant="ghost" className="gap-1" onClick={limpar}>
              <X className="size-4" /> Cancelar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {links.map((l) => (
          <div
            key={l.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-border p-2"
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  l.arquivado && "text-muted-foreground line-through",
                )}
              >
                {l.nome}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{l.url}</p>
              {l.descricao ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{l.descricao}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditando(l);
                  setNome(l.nome);
                  setUrl(l.url);
                  setDescricao(l.descricao);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                title={l.arquivado ? "Reativar" : "Arquivar"}
                onClick={async () => {
                  await updateLink(l.id, { arquivado: !l.arquivado });
                  invalidate();
                }}
              >
                {l.arquivado ? "Reativar" : "Arquivar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!window.confirm(`Excluir o link "${l.nome}"?`)) return;
                  await deleteLink(l.id);
                  toast.success("Link excluído");
                  invalidate();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum link cadastrado ainda.</p>
        ) : null}
      </div>
    </section>
  );
}

function resumoPermissoes(perms: PermState): string {
  const atuais = [...stateToPerms(perms)].sort().join("|");
  const preset = PRESETS.find((p) => [...p.permissoes].sort().join("|") === atuais);
  const abas = Object.values(perms).filter((v) => v !== "nenhum").length;
  if (abas === 0) return "Sem acesso";
  return `${preset ? `Preset ${preset.label}` : "Personalizado"} · ${abas} ${abas === 1 ? "aba" : "abas"}`;
}

function PermissoesDialog({
  user,
  perms,
  onApply,
  podeQuadros,
}: {
  user: UserRowData;
  perms: PermState;
  onApply: (p: PermState) => void;
  podeQuadros: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<PermState>(perms);
  const { data: marcados = [] } = useQuery({ ...quadrosDoUsuarioQueryOptions(user.id), enabled: podeQuadros });
  const quadrosTxt = podeQuadros ? ` · ${marcados.length} ${marcados.length === 1 ? "quadro" : "quadros"}` : "";

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        if (o) setRascunho(perms);
        setAberto(o);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
          Permissões
          <span className="text-xs font-normal text-muted-foreground">
            {resumoPermissoes(perms)}
            {quadrosTxt}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões de {user.nome}</DialogTitle>
        </DialogHeader>
        <PermissionPanel state={rascunho} onChange={setRascunho} />
        {podeQuadros ? <QuadrosDoUsuario userId={user.id} nome={user.nome} /> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onApply(rascunho);
              setAberto(false);
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
        <p className="text-[11px] text-muted-foreground">
          Aplicar guarda na ficha. Clique em Salvar na ficha para gravar.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function QuadrosDoUsuario({ userId, nome }: { userId: string; nome: string }) {
  const queryClient = useQueryClient();
  const { data: quadros = [] } = useQuery(quadrosQueryOptions);
  const { data: marcados = [], isLoading } = useQuery(quadrosDoUsuarioQueryOptions(userId));
  const [sel, setSel] = useState<string[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  const atual = sel ?? marcados;
  const mudou = sel !== null && [...sel].sort().join() !== [...marcados].sort().join();

  async function salvar() {
    if (!sel) return;
    setSalvando(true);
    try {
      await setQuadrosDoUsuario(userId, sel);
      queryClient.setQueryData(["tarefas", "quadros-do-usuario", userId], sel);
      toast.success(`Quadros de ${nome} atualizados`);
      setSel(null);
      queryClient.invalidateQueries({ queryKey: ["tarefas", "quadros-do-usuario", userId] });
      queryClient.invalidateQueries({ queryKey: ["tarefas", "quadros"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-3 space-y-1.5">
      <Label>Quadros em que entra</Label>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {quadros.map((q) => (
            <label key={q.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={atual.includes(q.id)}
                onCheckedChange={(c) =>
                  setSel((s) => {
                    const base = s ?? marcados;
                    return c ? [...base, q.id] : base.filter((x) => x !== q.id);
                  })
                }
              />
              <span className="flex-1">{q.nome}</span>
              {q.acesso === "aberto" ? (
                <span className="text-[11px] text-muted-foreground">aberto a todos</span>
              ) : null}
            </label>
          ))}
          {quadros.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum quadro ativo.</p>
          ) : null}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Em quadro aberto a marcação fica guardada e só passa a valer se o quadro virar restrito.
        Admin entra em todos sem precisar de marcação.
      </p>
      {mudou ? (
        <Button size="sm" variant="outline" disabled={salvando} onClick={salvar}>
          Salvar quadros
        </Button>
      ) : null}
    </div>
  );
}
