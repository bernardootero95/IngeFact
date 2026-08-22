import { supabase } from "../supabase.js";

/**
 * Devuelve la empresa (tenant) a la que pertenece un usuario de `usuarios_empresas`,
 * o null si el usuario no está vinculado a ninguna empresa activa.
 */
export async function getEmpresaByUsuarioId(userId) {
  const { data, error } = await supabase
    .from("usuarios_empresas")
    .select(
      `
      empresa_id,
      empresas (
        razon_social,
        nombre_comercial
      )
    `,
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.empresas) return null;

  const empresa = Array.isArray(data.empresas) ? data.empresas[0] : data.empresas;
  return { empresaId: data.empresa_id, ...empresa };
}
