import { apiRequest } from "../apiClient.js";

export async function getDashboardKpis() {
  return apiRequest("/api/v1/admin/dashboard");
}
