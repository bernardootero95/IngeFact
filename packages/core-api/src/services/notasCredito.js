import { apiRequest, apiRequestBlob } from "../apiClient.js";

export async function listNotasCredito({ estado, facturaId } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (facturaId) params.set("factura_id", facturaId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/v1/tenant/notas-credito${query}`);
}

export async function getNotaCredito(id) {
  return apiRequest(`/api/v1/tenant/notas-credito/${id}`);
}

export async function obtenerLineasDisponiblesFactura(facturaId) {
  return apiRequest(`/api/v1/tenant/facturas/${facturaId}/lineas-disponibles`);
}

export async function crearBorradorNotaCredito(facturaId, payload) {
  return apiRequest(`/api/v1/tenant/facturas/${facturaId}/notas-credito`, { method: "POST", body: payload });
}

export async function actualizarBorradorNotaCredito(id, payload) {
  return apiRequest(`/api/v1/tenant/notas-credito/${id}`, { method: "PUT", body: payload });
}

export async function eliminarBorradorNotaCredito(id) {
  return apiRequest(`/api/v1/tenant/notas-credito/${id}`, { method: "DELETE" });
}

export async function enviarNotaCredito(id) {
  return apiRequest(`/api/v1/tenant/notas-credito/${id}/enviar`, { method: "POST" });
}

export async function anularFactura(facturaId) {
  return apiRequest(`/api/v1/tenant/facturas/${facturaId}/anular`, { method: "POST" });
}

export async function obtenerUrlXmlNotaCredito(id) {
  return apiRequest(`/api/v1/tenant/notas-credito/${id}/xml`);
}

export async function obtenerFirmaDigitalNotaCredito(id) {
  return apiRequest(`/api/v1/tenant/notas-credito/${id}/firma-digital`);
}

export async function obtenerRepresentacionPdfNotaCredito(id) {
  return apiRequestBlob(`/api/v1/tenant/notas-credito/${id}/representacion.pdf`);
}
