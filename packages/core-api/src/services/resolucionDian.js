import { apiRequest } from "../apiClient.js";

/**
 * Resolucion DIAN del tenant autenticado (resuelta desde el JWT en el
 * backend). Lanza un error con `status: 404` si la empresa todavia no tiene
 * una resolucion configurada -- el caller debe capturarlo para mostrar el
 * formulario vacio en vez de un error real.
 */
export async function getResolucionDian() {
  return apiRequest("/api/v1/tenant/resolucion");
}

export async function guardarResolucionDian(payload) {
  return apiRequest("/api/v1/tenant/resolucion", { method: "PUT", body: payload });
}

export async function validarResolucionDian() {
  return apiRequest("/api/v1/tenant/resolucion/validar", { method: "POST" });
}
