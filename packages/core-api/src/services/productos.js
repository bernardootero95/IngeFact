import { supabase } from "../supabase.js";

/**
 * Lista los productos/servicios activos de una empresa (tenant), más recientes primero.
 */
export async function listProductos(empresaId) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("empresa_id", empresaId)
    .is("eliminado", null)
    .order("creado", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Crea un producto/servicio para una empresa (tenant) y devuelve el registro insertado.
 */
export async function createProducto(payload) {
  const { data, error } = await supabase
    .from("productos")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
