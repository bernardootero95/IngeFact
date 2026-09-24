import { apiRequest, apiRequestBlob } from "../apiClient.js";

export async function listNomina(empleadoId) {
  const query = empleadoId ? `?empleado_id=${encodeURIComponent(empleadoId)}` : "";
  return apiRequest(`/api/v1/tenant/nomina${query}`);
}

export async function getNomina(id) {
  return apiRequest(`/api/v1/tenant/nomina/${id}`);
}

export async function crearBorradorNomina(payload) {
  return apiRequest("/api/v1/tenant/nomina", { method: "POST", body: payload });
}

export async function actualizarBorradorNomina(id, payload) {
  return apiRequest(`/api/v1/tenant/nomina/${id}`, { method: "PUT", body: payload });
}

export async function eliminarBorradorNomina(id) {
  return apiRequest(`/api/v1/tenant/nomina/${id}`, { method: "DELETE" });
}

export async function enviarNomina(id) {
  return apiRequest(`/api/v1/tenant/nomina/${id}/enviar`, { method: "POST" });
}

export async function anularNomina(id) {
  return apiRequest(`/api/v1/tenant/nomina/${id}/anular`, { method: "POST" });
}

export async function enviarNominaPorCorreo(id, correo) {
  return apiRequest(`/api/v1/tenant/nomina/${id}/enviar-correo`, {
    method: "POST",
    body: correo ? { correo } : undefined,
  });
}

export async function obtenerUrlXmlNomina(id) {
  return apiRequest(`/api/v1/tenant/nomina/${id}/xml`);
}

export async function obtenerRepresentacionPdfNomina(id) {
  return apiRequestBlob(`/api/v1/tenant/nomina/${id}/representacion.pdf`);
}
