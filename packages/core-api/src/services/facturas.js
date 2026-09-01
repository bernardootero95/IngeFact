import { apiRequest } from "../apiClient.js";

export async function listFacturas({ estado, clienteId } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (clienteId) params.set("cliente_id", clienteId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/v1/tenant/facturas${query}`);
}

export async function getFactura(id) {
  return apiRequest(`/api/v1/tenant/facturas/${id}`);
}

export async function crearBorradorFactura(payload) {
  return apiRequest("/api/v1/tenant/facturas", { method: "POST", body: payload });
}

export async function actualizarBorradorFactura(id, payload) {
  return apiRequest(`/api/v1/tenant/facturas/${id}`, { method: "PUT", body: payload });
}

export async function eliminarBorradorFactura(id) {
  return apiRequest(`/api/v1/tenant/facturas/${id}`, { method: "DELETE" });
}

export async function enviarFactura(id, payload) {
  return apiRequest(`/api/v1/tenant/facturas/${id}/enviar`, { method: "POST", body: payload });
}

export async function obtenerUrlXmlFactura(id) {
  return apiRequest(`/api/v1/tenant/facturas/${id}/xml`);
}

export async function obtenerFirmaDigitalFactura(id) {
  return apiRequest(`/api/v1/tenant/facturas/${id}/firma-digital`);
}
