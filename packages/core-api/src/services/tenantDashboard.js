import { apiRequest } from "../apiClient.js";

export async function getTenantDashboardKpis() {
  return apiRequest("/api/v1/tenant/dashboard");
}
