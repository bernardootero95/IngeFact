import { apiRequest } from "../apiClient.js";

/**
 * Datos de la empresa del tenant autenticado (resuelta desde el JWT en el
 * backend, no requiere pasar un id).
 */
export async function getMiEmpresa() {
  return apiRequest("/api/v1/tenant/empresa");
}
