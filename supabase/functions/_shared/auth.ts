export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apiKey, content-type",
};

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("No autenticado: falta el token de sesión.");
  return token;
}

/**
 * Valida que quien llama sea staff interno de IngeFact (tabla `usuarios`),
 * activo y no eliminado. Mismo criterio que apps/admin/src/modules/auth/store/authStore.js.
 */
export async function requireInternalAdmin(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
) {
  const token = getBearerToken(req);
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) throw new Error("No autenticado.");

  const { data: staff, error: staffError } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("id", user.id)
    .eq("estado", "activo")
    .is("eliminado", null)
    .maybeSingle();

  if (staffError) throw new Error(`Error de autorización: ${staffError.message}`);
  if (!staff) throw new Error("No autorizado: no eres staff interno activo.");

  return user;
}

/**
 * Valida que quien llama sea un usuario activo de un tenant (tabla `usuarios_empresas`).
 */
export async function requireTenantUser(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
) {
  const token = getBearerToken(req);
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) throw new Error("No autenticado.");

  const { data: tenantUser, error: tenantError } = await supabaseAdmin
    .from("usuarios_empresas")
    .select("id, empresa_id")
    .eq("id", user.id)
    .eq("estado", "activo")
    .maybeSingle();

  if (tenantError) throw new Error(`Error de autorización: ${tenantError.message}`);
  if (!tenantUser) throw new Error("No autorizado: no perteneces a ningún tenant activo.");

  return { user, empresaId: tenantUser.empresa_id };
}
