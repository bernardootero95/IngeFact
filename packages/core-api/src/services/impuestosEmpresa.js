import { supabase } from "../supabase.js";

/**
 * Lista los impuestos (tributo + tarifa) configurados por una empresa (tenant).
 */
export async function listImpuestosEmpresa(empresaId) {
  const { data, error } = await supabase
    .from("impuestos_empresa")
    .select("*")
    .eq("empresa_id", empresaId)
    .is("eliminado", null)
    .order("creado", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Crea un impuesto (tributo + tarifa) para una empresa (tenant) y devuelve el registro insertado.
 */
export async function createImpuestoEmpresa(payload) {
  const { data, error } = await supabase
    .from("impuestos_empresa")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
