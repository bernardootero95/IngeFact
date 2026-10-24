import { apiRequest } from "../apiClient.js";

export async function listFacturasRecibidas({ proveedorId } = {}) {
  const query = proveedorId ? `?proveedor_id=${encodeURIComponent(proveedorId)}` : "";
  return apiRequest(`/api/v1/tenant/facturas-recibidas${query}`);
}

export async function getFacturaRecibida(id) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/${id}`);
}

// Resumen de la factura (leido de la DIAN) antes de registrarla.
export async function consultarFacturaRecibida(cufe) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/consulta?cufe=${encodeURIComponent(cufe)}`);
}

export async function obtenerXmlFacturaRecibida(id) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/${id}/xml`);
}

export async function crearFacturaRecibida(payload) {
  return apiRequest("/api/v1/tenant/facturas-recibidas", { method: "POST", body: payload });
}

// Carga masiva, paso 1: el Excel de la DIAN en base64; devuelve las facturas
// a credito que se pueden cargar y cuantas filas se omitieron por motivo.
export async function leerReporteDian(payload) {
  return apiRequest("/api/v1/tenant/facturas-recibidas/reporte-dian", { method: "POST", body: payload });
}

// Carga masiva, paso 2: registra un lote de CUFE (maximo 20) y devuelve el
// resultado de cada uno.
export async function cargarLoteFacturasRecibidas(cufes) {
  return apiRequest("/api/v1/tenant/facturas-recibidas/lote", { method: "POST", body: { cufes } });
}

export async function eliminarFacturaRecibida(id) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/${id}`, { method: "DELETE" });
}

export async function registrarEventoReceptor(facturaRecibidaId, payload) {
  return apiRequest(`/api/v1/tenant/facturas-recibidas/${facturaRecibidaId}/eventos`, {
    method: "POST",
    body: payload,
  });
}
