import { apiRequest } from "../apiClient.js";

/**
 * Datos de la empresa del tenant autenticado (resuelta desde el JWT en el
 * backend, no requiere pasar un id).
 */
export async function getMiEmpresa() {
  return apiRequest("/api/v1/tenant/empresa");
}

/**
 * Solo el subconjunto de datos informativos que el propio tenant puede
 * editar (nombre_comercial, telefono, direccion) -- razon social/NIT/correo
 * son de solo lectura para el tenant, los administra staff desde apps/admin.
 */
export async function actualizarDatosEmpresa(payload) {
  return apiRequest("/api/v1/tenant/empresa", { method: "PATCH", body: payload });
}
