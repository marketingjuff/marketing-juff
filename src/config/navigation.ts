/**
 * Configuração central de navegação e permissões do Marketing Juff.
 * Para adicionar uma nova aba ou sub aba, acrescente linhas aqui e a
 * entrada correspondente em PERMISSION_CATALOG. A tela de Configurações
 * e os presets leem daqui, então nada mais precisa ser tocado.
 */

export type PermissionKey = string;

export type AppRoleKey = "admin" | "gestor" | "operador";

export const READONLY_SUFFIX = ":leitura";

/** Uma linha por aba do sistema. */
export type PermissionEntry = {
  key: PermissionKey;
  /** Aba mestre a que pertence, usado para agrupar na tela de Configurações. */
  grupo: string;
  label: string;
  /** true quando faz sentido liberar a aba somente em leitura. */
  nivelConfiguravel: boolean;
};

export const PERMISSION_CATALOG: PermissionEntry[] = [
  { key: "social.stories", grupo: "Social", label: "Stories", nivelConfiguravel: true },

  { key: "tarefas.quadros", grupo: "Tarefas", label: "Quadros", nivelConfiguravel: true },
  { key: "tarefas.meu_trabalho", grupo: "Tarefas", label: "Meu trabalho", nivelConfiguravel: false },
  { key: "tarefas.calendario", grupo: "Tarefas", label: "Calendário", nivelConfiguravel: false },
  { key: "tarefas.meu_dia", grupo: "Tarefas", label: "Meu dia", nivelConfiguravel: false },

  { key: "estrategia.ata", grupo: "Estratégia", label: "Ata mensal", nivelConfiguravel: true },

  { key: "biblioteca.produtos", grupo: "Biblioteca", label: "Produtos", nivelConfiguravel: false },
  { key: "biblioteca.marca", grupo: "Biblioteca", label: "Marca", nivelConfiguravel: false },
  { key: "biblioteca.arquivos", grupo: "Biblioteca", label: "Arquivos", nivelConfiguravel: false },
  { key: "biblioteca.estampa", grupo: "Biblioteca", label: "Estampas", nivelConfiguravel: false },

  { key: "config.usuarios", grupo: "Configurações", label: "Usuários e permissões", nivelConfiguravel: false },
];

const POR_KEY = new Map(PERMISSION_CATALOG.map((p) => [p.key, p]));

export function labelDaPermissao(key: PermissionKey): string {
  return POR_KEY.get(key)?.label ?? key;
}

export function nivelConfiguravel(key: PermissionKey): boolean {
  return POR_KEY.get(key)?.nivelConfiguravel ?? false;
}

export function gruposDePermissao(): string[] {
  return Array.from(new Set(PERMISSION_CATALOG.map((p) => p.grupo)));
}

export function permissoesDoGrupo(grupo: string): PermissionEntry[] {
  return PERMISSION_CATALOG.filter((p) => p.grupo === grupo);
}

export type NivelAcesso = "edicao" | "leitura";

/** "tarefas.quadros:leitura" vira { key, nivel } */
export function parsePermissao(raw: string): { key: PermissionKey; nivel: NivelAcesso } | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const i = s.indexOf(":");
  if (i === -1) return { key: s, nivel: "edicao" };
  const key = s.slice(0, i).trim();
  if (!key) return null;
  return { key, nivel: s.slice(i + 1).trim().toLowerCase() === "leitura" ? "leitura" : "edicao" };
}

export function serializarPermissao(key: PermissionKey, nivel: NivelAcesso): string {
  return nivel === "leitura" ? `${key}${READONLY_SUFFIX}` : key;
}

/** Nível efetivo de cada permissão que a pessoa tem. */
export function niveisPermissoes(permissions: string[] | null | undefined) {
  const out = new Map<PermissionKey, NivelAcesso>();
  for (const raw of permissions ?? []) {
    const p = parsePermissao(raw);
    if (!p || !POR_KEY.has(p.key)) continue;
    const atual = out.get(p.key);
    if (atual === "edicao") continue;
    out.set(p.key, p.nivel);
  }
  return out;
}

// ---------------- Presets ----------------

export type Preset = { id: string; label: string; descricao: string; permissoes: string[] };

/**
 * Pacotes prontos de permissão. Sempre que um módulo novo nascer,
 * acrescente a chave nova nos presets que devem enxergá-lo.
 */
export const PRESETS: Preset[] = [
  {
    id: "marketing_completo",
    label: "Marketing completo",
    descricao: "Tudo liberado em edição, menos Configurações",
    permissoes: ["social.stories", "tarefas.quadros", "tarefas.meu_trabalho", "tarefas.calendario", "estrategia.ata", "tarefas.meu_dia", "biblioteca.produtos", "biblioteca.marca", "biblioteca.arquivos", "biblioteca.estampa"],
  },
  {
    id: "social",
    label: "Social",
    descricao: "Só Stories, em edição",
    permissoes: ["social.stories"],
  },
  {
    id: "tarefas_completo",
    label: "Tarefas completo",
    descricao: "As três visões de Tarefas, em edição",
    permissoes: ["tarefas.quadros", "tarefas.meu_trabalho", "tarefas.calendario", "tarefas.meu_dia"],
  },
  {
    id: "designer",
    label: "Designer",
    descricao: "Stories em edição e Tarefas em edição",
    permissoes: ["social.stories", "tarefas.quadros", "tarefas.meu_trabalho", "tarefas.calendario", "biblioteca.produtos", "biblioteca.marca", "biblioteca.arquivos", "biblioteca.estampa"],
  },
  {
    id: "freelancer",
    label: "Freelancer",
    descricao: "Só Tarefas. Marque a pessoa nos quadros que ela pode ver",
    permissoes: ["tarefas.quadros", "tarefas.meu_trabalho"],
  },
  {
    id: "consulta",
    label: "Consulta",
    descricao: "Enxerga tudo, não edita nada",
    permissoes: [
      "social.stories:leitura",
      "tarefas.quadros:leitura",
      "tarefas.meu_trabalho",
      "tarefas.calendario",
      "estrategia.ata:leitura",
      "biblioteca.produtos",
      "biblioteca.marca",
      "biblioteca.arquivos",
      "biblioteca.estampa",
    ],
  },
];

export type SubTab = {
  key: string;
  label: string;
  to: string;
  permission: PermissionKey;
  roles?: AppRoleKey[];
};

export type MasterTab = {
  key: string;
  label: string;
  /** Nome do ícone lucide usado no topo, ao lado do nome. */
  icone: "megaphone" | "square-kanban" | "telescope" | "library";
  subTabs: SubTab[];
};

export const NAVIGATION: MasterTab[] = [
  {
    key: "social",
    label: "SOCIAL",
    icone: "megaphone",
    subTabs: [
      { key: "stories", label: "Stories", to: "/social/stories", permission: "social.stories" },
    ],
  },
  {
    key: "tarefas",
    label: "TAREFAS",
    icone: "square-kanban",
    subTabs: [
      { key: "quadros", label: "Quadros", to: "/tarefas/quadros", permission: "tarefas.quadros" },
      {
        key: "meu-trabalho",
        label: "Meu trabalho",
        to: "/tarefas/meu-trabalho",
        permission: "tarefas.meu_trabalho",
      },
      {
        key: "calendario",
        label: "Calendário",
        to: "/tarefas/calendario",
        permission: "tarefas.calendario",
      },
      {
        key: "meu-dia",
        label: "Meu dia",
        to: "/tarefas/meu-dia",
        permission: "tarefas.meu_dia",
      },
    ],
  },
  {
    key: "estrategia",
    label: "ESTRATÉGIA",
    icone: "telescope",
    subTabs: [
      { key: "ata", label: "Ata mensal", to: "/estrategia/ata", permission: "estrategia.ata" },
    ],
  },
  {
    key: "biblioteca",
    label: "BIBLIOTECA",
    icone: "library",
    subTabs: [
      { key: "produtos", label: "Produtos", to: "/biblioteca/produtos", permission: "biblioteca.produtos" },
      { key: "medidas", label: "Medidas", to: "/biblioteca/medidas", permission: "biblioteca.produtos" },
      { key: "cores", label: "Cores", to: "/biblioteca/cores", permission: "biblioteca.marca" },
      { key: "textos", label: "Textos", to: "/biblioteca/textos", permission: "biblioteca.marca" },
      { key: "arquivos", label: "Arquivos", to: "/biblioteca/arquivos", permission: "biblioteca.arquivos" },
      { key: "estampas", label: "Estampas", to: "/biblioteca/estampas", permission: "biblioteca.estampa" },
    ],
  },
];
