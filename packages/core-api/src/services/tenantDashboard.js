import { apiRequest } from "../apiClient.js";

export async function getTenantDashboardKpis() {
  return apiRequest("/api/v1/tenant/dashboard");
}

export async function getTenantDashboardActividad() {
  return apiRequest("/api/v1/tenant/dashboard/actividad");
}
