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
  /** tres: Sem acesso/Somente leitura/Edição. ver: Sem acesso/Ver. editar: Sem acesso/Edição. */
  modo: "tres" | "ver" | "editar";
};

export const PERMISSION_CATALOG: PermissionEntry[] = [
  { key: "social.stories", grupo: "Social", label: "Stories", nivelConfiguravel: true, modo: "tres" },

  { key: "tarefas.quadros", grupo: "Tarefas", label: "Quadros", nivelConfiguravel: true, modo: "tres" },
  { key: "tarefas.meu_trabalho", grupo: "Tarefas", label: "Meu trabalho", nivelConfiguravel: false, modo: "ver" },
  { key: "tarefas.calendario", grupo: "Tarefas", label: "Calendário", nivelConfiguravel: false, modo: "ver" },
  { key: "tarefas.meu_dia", grupo: "Tarefas", label: "Meu dia", nivelConfiguravel: false, modo: "editar" },

  { key: "estrategia.ata", grupo: "Estratégia", label: "Ata mensal", nivelConfiguravel: true, modo: "tres" },

  { key: "biblioteca.produtos", grupo: "Biblioteca", label: "Produtos", nivelConfiguravel: true, modo: "tres" },
  { key: "biblioteca.marca", grupo: "Biblioteca", label: "Marca", nivelConfiguravel: true, modo: "tres" },
  { key: "biblioteca.arquivos", grupo: "Biblioteca", label: "Arquivos", nivelConfiguravel: true, modo: "tres" },
  { key: "biblioteca.catalogo_estampas", grupo: "Biblioteca", label: "Estampas", nivelConfiguravel: true, modo: "tres" },
  { key: "biblioteca.estampa", grupo: "Biblioteca", label: "Cores de estampa", nivelConfiguravel: true, modo: "tres" },

  { key: "config.usuarios", grupo: "Configurações", label: "Usuários e permissões", nivelConfiguravel: false, modo: "editar" },
];

const POR_KEY = new Map(PERMISSION_CATALOG.map((p) => [p.key, p]));

export function labelDaPermissao(key: PermissionKey): string {
  return POR_KEY.get(key)?.label ?? key;
}

export function nivelConfiguravel(key: PermissionKey): boolean {
  return POR_KEY.get(key)?.nivelConfiguravel ?? false;
}

export function modoDaPermissao(key: PermissionKey): "tres" | "ver" | "editar" {
  return POR_KEY.get(key)?.modo ?? "editar";
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
    descricao: "Tudo em edição, menos Configurações",
    permissoes: ["social.stories", "tarefas.quadros", "tarefas.meu_trabalho", "tarefas.calendario", "tarefas.meu_dia", "estrategia.ata", "biblioteca.produtos", "biblioteca.marca", "biblioteca.arquivos", "biblioteca.estampa", "biblioteca.catalogo_estampas"],
  },
  {
    id: "social",
    label: "Social",
    descricao: "Stories e Tarefas em edição, Ata e Biblioteca em leitura",
    permissoes: ["social.stories", "tarefas.quadros", "tarefas.meu_trabalho", "tarefas.calendario", "tarefas.meu_dia", "estrategia.ata:leitura", "biblioteca.produtos:leitura", "biblioteca.marca:leitura", "biblioteca.arquivos:leitura", "biblioteca.estampa:leitura", "biblioteca.catalogo_estampas:leitura"],
  },
  {
    id: "comercial",
    label: "Comercial",
    descricao: "Tarefas em edição e Biblioteca em leitura, sem Stories e sem Ata",
    permissoes: ["tarefas.quadros", "tarefas.meu_trabalho", "tarefas.calendario", "tarefas.meu_dia", "biblioteca.produtos:leitura", "biblioteca.marca:leitura", "biblioteca.arquivos:leitura", "biblioteca.estampa:leitura", "biblioteca.catalogo_estampas:leitura"],
  },
  {
    id: "designer",
    label: "Designer",
    descricao: "Stories e Tarefas em edição, Biblioteca em leitura",
    permissoes: ["social.stories", "tarefas.quadros", "tarefas.meu_trabalho", "tarefas.calendario", "tarefas.meu_dia", "biblioteca.produtos:leitura", "biblioteca.marca:leitura", "biblioteca.arquivos:leitura", "biblioteca.estampa:leitura", "biblioteca.catalogo_estampas:leitura"],
  },
  {
    id: "freelancer",
    label: "Freelancer",
    descricao: "Só Quadros. Marque a pessoa nos quadros que ela pode ver",
    permissoes: ["tarefas.quadros", "tarefas.meu_trabalho"],
  },
  {
    id: "consulta",
    label: "Consulta",
    descricao: "Enxerga tudo, não edita nada",
    permissoes: ["social.stories:leitura", "tarefas.quadros:leitura", "tarefas.meu_trabalho", "tarefas.calendario", "estrategia.ata:leitura", "biblioteca.produtos:leitura", "biblioteca.marca:leitura", "biblioteca.arquivos:leitura", "biblioteca.estampa:leitura", "biblioteca.catalogo_estampas:leitura"],
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
  /** Cor da aba, usada na aba ativa do topo e no anel do atalho. */
  cor: string;
  subTabs: SubTab[];
};

export const NAVIGATION: MasterTab[] = [
  {
    key: "social",
    label: "SOCIAL",
    icone: "megaphone",
    cor: "#8354b5",
    subTabs: [
      { key: "stories", label: "Stories", to: "/social/stories", permission: "social.stories" },
    ],
  },
  {
    key: "tarefas",
    label: "TAREFAS",
    icone: "square-kanban",
    cor: "#323db8",
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
    cor: "#2e572d",
    subTabs: [
      { key: "ata", label: "Ata mensal", to: "/estrategia/ata", permission: "estrategia.ata" },
    ],
  },
  {
    key: "biblioteca",
    label: "BIBLIOTECA",
    icone: "library",
    cor: "#585858",
    subTabs: [
      { key: "produtos", label: "Produtos", to: "/biblioteca/produtos", permission: "biblioteca.produtos" },
      { key: "medidas", label: "Medidas", to: "/biblioteca/medidas", permission: "biblioteca.produtos" },
      { key: "cores", label: "Cores", to: "/biblioteca/cores", permission: "biblioteca.marca" },
      { key: "textos", label: "Textos", to: "/biblioteca/textos", permission: "biblioteca.marca" },
      { key: "arquivos", label: "Arquivos", to: "/biblioteca/arquivos", permission: "biblioteca.arquivos" },
      { key: "catalogo-estampas", label: "Editor de Estampas", to: "/biblioteca/catalogo-estampas", permission: "biblioteca.catalogo_estampas" },
      { key: "estampas", label: "Cores de estampa", to: "/biblioteca/estampas", permission: "biblioteca.estampa" },
    ],
  },
];

/** Aba mestre a que um caminho pertence, ou nulo quando não pertence a nenhuma. */
export function masterDoCaminho(caminho: string): MasterTab | undefined {
  return NAVIGATION.find((master) =>
    master.subTabs.some((sub) => caminho === sub.to || caminho.startsWith(`${sub.to}/`)),
  );
}
