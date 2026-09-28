import { apiRequest } from "../apiClient.js";

/**
 * Habilitacion DIAN del tenant autenticado: una entrada por tipo
 * ("facturacion" | "nomina") con su estado real ante la DIAN.
 */
export async function getHabilitacionesDian() {
  return apiRequest("/api/v1/tenant/habilitacion");
}

/** Envia el set de pruebas de un tipo con el TestSetId que entrega la DIAN. */
export async function enviarSetPruebas(tipo, testSetId) {
  return apiRequest(`/api/v1/tenant/habilitacion/${tipo}/set-pruebas`, {
    method: "POST",
    body: { test_set_id: testSetId },
  });
}
