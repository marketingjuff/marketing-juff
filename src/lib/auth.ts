import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { READONLY_SUFFIX, type PermissionKey } from "@/config/navigation";

export type AppRole = "admin" | "gestor" | "operador";

export type Profile = {
  id: string;
  nome: string;
  email: string;
  role: AppRole;
  permissions: string[];
  must_change_password: boolean;
};

export const profileQueryOptions = queryOptions({
  queryKey: ["profile"],
  queryFn: async (): Promise<Profile | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, role, permissions, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return {
        id: user.id,
        nome: user.email ?? "",
        email: user.email ?? "",
        role: "operador",
        permissions: [],
        must_change_password: false,
      };
    }
    return data as Profile;
  },
  staleTime: 30_000,
});

export function hasPermission(profile: Profile | null, perm: PermissionKey): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.permissions.some((p) => p === perm || p === `${perm}${READONLY_SUFFIX}`);
}

export function canEdit(profile: Profile | null, perm: PermissionKey): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.permissions.includes(perm);
}

export function hasAnyPermission(profile: Profile | null): boolean {
  if (!profile) return false;
  return profile.role === "admin" || profile.permissions.length > 0;
}
