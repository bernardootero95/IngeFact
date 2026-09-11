import { apiRequest } from "../apiClient.js";

export async function listApiKeys(empresaId) {
  return apiRequest(`/api/v1/admin/empresas/${empresaId}/api-keys`);
}

export async function crearApiKey(empresaId, nombre) {
  return apiRequest(`/api/v1/admin/empresas/${empresaId}/api-keys`, { method: "POST", body: { nombre } });
}

export async function revocarApiKey(empresaId, apiKeyId) {
  return apiRequest(`/api/v1/admin/empresas/${empresaId}/api-keys/${apiKeyId}`, { method: "DELETE" });
}
