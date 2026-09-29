import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const roleSchema = z.enum(["admin", "gestor", "operador"]);

type Ctx = { supabase: any; userId: string };

/** Lê o papel de quem chama no servidor. Só admin e gestor passam. */
async function papelGestao(context: Ctx, erro: string): Promise<"admin" | "gestor"> {
  const { data: me } = await context.supabase
    .from("profiles")
    .select("role")
    .eq("id", context.userId)
    .maybeSingle();
  if (me?.role === "admin" || me?.role === "gestor") return me.role;
  throw new Error(erro);
}

/** Gestor só age sobre operador e nunca sobre si mesmo. */
async function exigirAlvoOperador(context: Ctx, userId: string) {
  if (userId === context.userId) throw new Error("Gestor só altera operadores");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: alvo } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (alvo?.role !== "operador") throw new Error("Gestor só altera operadores");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const papel = await papelGestao(context, "Apenas admin ou gestor pode listar usuários");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, nome, email, role, permissions, must_change_password, created_at")
      .order("created_at", { ascending: true });
    if (papel === "gestor") q = q.eq("role", "operador").neq("id", context.userId);
    const { data, error } = await q;
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
    const papel = await papelGestao(context, "Apenas admin ou gestor pode criar contas");
    const role = papel === "gestor" ? "operador" : data.role;

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
      role,
      permissions: role === "admin" ? [] : data.permissions,
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
    const papel = await papelGestao(context, "Apenas admin ou gestor pode alterar permissões");
    if (papel === "gestor") {
      await exigirAlvoOperador(context, data.userId);
      if (data.role !== "operador") throw new Error("Gestor só altera operadores");
    }

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
    const papel = await papelGestao(context, "Apenas admin ou gestor pode trocar senhas");
    if (papel === "gestor") await exigirAlvoOperador(context, data.userId);

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
    const papel = await papelGestao(context, "Apenas admin ou gestor pode excluir contas");
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta");
    if (papel === "gestor") await exigirAlvoOperador(context, data.userId);

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
