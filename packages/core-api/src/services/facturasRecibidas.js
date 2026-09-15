import { apiRequest } from "../apiClient.js";

export async function listFacturasRecibidas({ proveedorId } = {}) {
  const query = proveedorId ? `?proveedor_id=${encodeURIComponent(proveedorId)}` : "";
  return apiRequest(`/api/v1/tenant/facturas-recibidas${query}`);
}

export async function getFacturaRecibida(id) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/${id}`);
}

export async function crearFacturaRecibida(payload) {
  return apiRequest("/api/v1/tenant/facturas-recibidas", { method: "POST", body: payload });
}

export async function eliminarFacturaRecibida(id) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/${id}`, { method: "DELETE" });
}

export async function registrarEventoReceptor(facturaRecibidaId, payload) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/${facturaRecibidaId}/eventos`, {
    method: "POST",
    body: payload,
  });
}
