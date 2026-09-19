import { apiRequest, apiRequestBlob } from "../apiClient.js";

export async function listDocumentosSoporte({ estado, proveedorId } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (proveedorId) params.set("proveedor_id", proveedorId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/v1/tenant/documentos-soporte${query}`);
}

export async function getDocumentoSoporte(id) {
  return apiRequest(`/api/v1/tenant/documentos-soporte/${id}`);
}

export async function crearBorradorDocumentoSoporte(payload) {
  return apiRequest("/api/v1/tenant/documentos-soporte", { method: "POST", body: payload });
}

export async function actualizarBorradorDocumentoSoporte(id, payload) {
  return apiRequest(`/api/v1/tenant/documentos-soporte/${id}`, { method: "PUT", body: payload });
}

export async function eliminarBorradorDocumentoSoporte(id) {
  return apiRequest(`/api/v1/tenant/documentos-soporte/${id}`, { method: "DELETE" });
}

export async function enviarDocumentoSoporte(id, payload) {
  return apiRequest(`/api/v1/tenant/documentos-soporte/${id}/enviar`, { method: "POST", body: payload });
}

export async function obtenerFirmaDigitalDocumentoSoporte(id) {
  return apiRequest(`/api/v1/tenant/documentos-soporte/${id}/firma-digital`);
}

export async function obtenerRepresentacionPdfDocumentoSoporte(id) {
  return apiRequestBlob(`/api/v1/tenant/documentos-soporte/${id}/representacion.pdf`);
}

export async function enviarDocumentoSoportePorCorreo(id) {
  return apiRequest(`/api/v1/tenant/documentos-soporte/${id}/enviar-correo`, { method: "POST" });
}
