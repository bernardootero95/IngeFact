import { apiRequest } from "../apiClient.js";

export async function listEmpresas({ estado, fechaDesde, fechaHasta } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (fechaDesde) params.set("fecha_desde", fechaDesde);
  if (fechaHasta) params.set("fecha_hasta", fechaHasta);
  const query = params.toString();
  return apiRequest(`/api/v1/empresas${query ? `?${query}` : ""}`);
}

export async function getEmpresa(id) {
  return apiRequest(`/api/v1/empresas/${id}`);
}

export async function crearEmpresa(payload) {
  return apiRequest("/api/v1/empresas", { method: "POST", body: payload });
}

export async function actualizarEmpresa(id, payload) {
  return apiRequest(`/api/v1/empresas/${id}`, { method: "PATCH", body: payload });
}

export async function cambiarPlanEmpresa(id, payload) {
  return apiRequest(`/api/v1/empresas/${id}/plan`, { method: "PATCH", body: payload });
}

export async function sincronizarEmpresasAlegra() {
  return apiRequest("/api/v1/empresas/sync-alegra", { method: "POST" });
}
