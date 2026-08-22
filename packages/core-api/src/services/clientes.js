import { supabase } from "../supabase.js";

/**
 * Lista los clientes activos de una empresa (tenant), más recientes primero.
 */
export async function listClientes(empresaId) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("empresa_id", empresaId)
    .is("eliminado", null)
    .order("creado", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Crea un cliente para una empresa (tenant) y devuelve el registro insertado.
 */
export async function createCliente(payload) {
  const { data, error } = await supabase
    .from("clientes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
