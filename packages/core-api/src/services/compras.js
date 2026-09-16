import { apiRequest } from "../apiClient.js";

export async function listCompras({ estado, proveedorId } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (proveedorId) params.set("proveedor_id", proveedorId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/v1/tenant/compras${query}`);
}

export async function getCompra(id) {
  return apiRequest(`/api/v1/tenant/compras/${id}`);
}

export async function createCompra(payload) {
  return apiRequest("/api/v1/tenant/compras", { method: "POST", body: payload });
}

/**
 * Vista previa (no persiste nada) para prellenar el formulario de Compra a
 * partir del CUFE de una factura electronica real. Lanza un error con
 * `status: 404` si la DIAN no conoce ese CUFE -- el caller debe capturarlo
 * y dejar seguir el flujo manual, no es un error fatal.
 */
export async function consultarCufe(cufe) {
  return apiRequest(`/api/v1/tenant/compras/consultar-cufe?cufe=${encodeURIComponent(cufe)}`);
}

export async function anularCompra(id) {
  return apiRequest(`/api/v1/tenant/compras/${id}/anular`, { method: "POST" });
}

export async function deleteCompra(id) {
  return apiRequest(`/api/v1/tenant/compras/${id}`, { method: "DELETE" });
}
