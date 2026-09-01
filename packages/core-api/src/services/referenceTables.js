import { apiRequest } from "../apiClient.js";

/**
 * Lectura publica de un catalogo DIAN, sin guard de rol -- pensada para
 * apps/user (el tenant no es staff interno, no puede usar el endpoint admin).
 */
export async function listPublicReferenceTable(tabla) {
  return apiRequest(`/api/v1/public/reference-tables/${tabla}`);
}

export async function listReferenceTable(tabla, search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest(`/api/v1/admin/reference-tables/${tabla}${query}`);
}

export async function crearReferenceRecord(tabla, payload) {
  return apiRequest(`/api/v1/admin/reference-tables/${tabla}`, { method: "POST", body: payload });
}

export async function actualizarReferenceRecord(tabla, id, payload) {
  return apiRequest(`/api/v1/admin/reference-tables/${tabla}/${id}`, { method: "PATCH", body: payload });
}

export async function sincronizarReferenceTable(tabla) {
  return apiRequest(`/api/v1/admin/reference-tables/${tabla}/sync`, { method: "POST" });
}
