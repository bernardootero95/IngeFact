import { apiRequest } from "../apiClient.js";

/**
 * Resolucion DIAN de Documento Soporte del tenant autenticado. Lanza un
 * error con `status: 404` si la empresa todavia no la ha configurado -- el
 * caller debe capturarlo para mostrar el formulario vacio.
 */
export async function getResolucionDocumentoSoporte() {
  return apiRequest("/api/v1/tenant/resolucion-documento-soporte");
}

export async function guardarResolucionDocumentoSoporte(payload) {
  return apiRequest("/api/v1/tenant/resolucion-documento-soporte", { method: "PUT", body: payload });
}
