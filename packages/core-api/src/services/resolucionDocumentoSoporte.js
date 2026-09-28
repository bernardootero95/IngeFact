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

/**
 * Compara la resolucion guardada contra la registrada ante la DIAN y
 * devuelve la resolucion con estado_validacion/mensaje_validacion al dia.
 */
export async function validarResolucionDocumentoSoporte() {
  return apiRequest("/api/v1/tenant/resolucion-documento-soporte/validar", { method: "POST" });
}

/**
 * Rangos registrados ante la DIAN para el NIT del tenant (via Alegra, solo
 * produccion). No persiste nada: devuelve `{ resoluciones: [...] }` para que
 * el tenant elija una y la confirme con "Guardar".
 */
export async function cargarResolucionDocumentoSoporteDesdeAlegra() {
  return apiRequest("/api/v1/tenant/resolucion-documento-soporte/cargar-alegra");
}
