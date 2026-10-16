import { apiRequest } from "../apiClient.js";

export async function getConfiguracionNegocio() {
  return apiRequest("/api/v1/admin/configuracion");
}

export async function guardarConfiguracionNegocio(payload) {
  return apiRequest("/api/v1/admin/configuracion", { method: "PUT", body: payload });
}
