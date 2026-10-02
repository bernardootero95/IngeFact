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

/** { data_url } del logo (o data_url null si la empresa no tiene). */
export async function getLogoEmpresa() {
  return apiRequest("/api/v1/tenant/empresa/logo");
}

/** `imagen` es un data URL PNG/JPG (max 300 KB). Devuelve la empresa actualizada. */
export async function subirLogoEmpresa(imagen) {
  return apiRequest("/api/v1/tenant/empresa/logo", { method: "PUT", body: { imagen } });
}

export async function eliminarLogoEmpresa() {
  return apiRequest("/api/v1/tenant/empresa/logo", { method: "DELETE" });
}
