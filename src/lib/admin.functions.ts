import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const roleSchema = z.enum(["admin", "gestor", "operador"]);


export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (me?.role !== "admin") throw new Error("Apenas admin pode listar usuários");

    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nome, email, role, permissions, must_change_password, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        nome: z.string().min(1),
        email: z.string().email(),
        senha: z.string().min(8),
        role: roleSchema,
        permissions: z.array(z.string()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (me?.role !== "admin") throw new Error("Apenas admin pode criar contas");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar a conta");

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      nome: data.nome,
      email: data.email,
      role: data.role,
      permissions: data.role === "admin" ? [] : data.permissions,
      must_change_password: true,
    });
    if (profileError) throw profileError;

    return { ok: true };
  });

export const updatePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        role: roleSchema,
        permissions: z.array(z.string()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (me?.role !== "admin") throw new Error("Apenas admin pode alterar permissões");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        role: data.role,
        permissions: data.role === "admin" ? [] : data.permissions,
      })
      .eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), senha: z.string().min(8) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (me?.role !== "admin") throw new Error("Apenas admin pode trocar senhas");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.senha,
    });
    if (error) throw error;
    const { error: flagError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", data.userId);
    if (flagError) throw flagError;
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (me?.role !== "admin") throw new Error("Apenas admin pode excluir contas");
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });

/** Marca a própria conta como já tendo trocado a senha. */
export const clearMustChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
