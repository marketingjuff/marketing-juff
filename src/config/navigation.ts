/**
 * Configuração central de navegação e permissões do Marketing Juff.
 * Para adicionar uma nova aba ou sub aba, basta acrescentar linhas aqui.
 */

export type PermissionKey = string;

export const PERMISSION_CATALOG: { key: PermissionKey; label: string }[] = [
  { key: "social.stories", label: "Social · Stories" },
  { key: "config.usuarios", label: "Configurações · Usuários e permissões" },
];

export type SubTab = {
  key: string;
  label: string;
  to: string;
  permission: PermissionKey;
};

export type MasterTab = {
  key: string;
  label: string;
  subTabs: SubTab[];
};

export const NAVIGATION: MasterTab[] = [
  {
    key: "social",
    label: "SOCIAL",
    subTabs: [
      {
        key: "stories",
        label: "Stories",
        to: "/social/stories",
        permission: "social.stories",
      },
    ],
  },
];

export const READONLY_SUFFIX = ":leitura";
