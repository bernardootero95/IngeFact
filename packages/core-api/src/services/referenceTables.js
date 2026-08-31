import { apiRequest } from "../apiClient.js";

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
