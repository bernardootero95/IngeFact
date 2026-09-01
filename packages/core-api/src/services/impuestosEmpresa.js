import { apiRequest } from "../apiClient.js";

export async function listImpuestosEmpresa() {
  return apiRequest("/api/v1/tenant/impuestos");
}

export async function getImpuestoEmpresa(id) {
  return apiRequest(`/api/v1/tenant/impuestos/${id}`);
}

export async function createImpuestoEmpresa(payload) {
  return apiRequest("/api/v1/tenant/impuestos", { method: "POST", body: payload });
}

export async function updateImpuestoEmpresa(id, payload) {
  return apiRequest(`/api/v1/tenant/impuestos/${id}`, { method: "PATCH", body: payload });
}

export async function deleteImpuestoEmpresa(id) {
  return apiRequest(`/api/v1/tenant/impuestos/${id}`, { method: "DELETE" });
}
