import { apiRequest } from "../apiClient.js";

export async function listNotasDebito({ estado, facturaId } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (facturaId) params.set("factura_id", facturaId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/v1/tenant/notas-debito${query}`);
}

export async function getNotaDebito(id) {
  return apiRequest(`/api/v1/tenant/notas-debito/${id}`);
}

export async function crearBorradorNotaDebito(facturaId, payload) {
  return apiRequest(`/api/v1/tenant/facturas/${facturaId}/notas-debito`, { method: "POST", body: payload });
}

export async function actualizarBorradorNotaDebito(id, payload) {
  return apiRequest(`/api/v1/tenant/notas-debito/${id}`, { method: "PUT", body: payload });
}

export async function eliminarBorradorNotaDebito(id) {
  return apiRequest(`/api/v1/tenant/notas-debito/${id}`, { method: "DELETE" });
}

export async function enviarNotaDebito(id) {
  return apiRequest(`/api/v1/tenant/notas-debito/${id}/enviar`, { method: "POST" });
}

export async function obtenerUrlXmlNotaDebito(id) {
  return apiRequest(`/api/v1/tenant/notas-debito/${id}/xml`);
}

export async function obtenerFirmaDigitalNotaDebito(id) {
  return apiRequest(`/api/v1/tenant/notas-debito/${id}/firma-digital`);
}
