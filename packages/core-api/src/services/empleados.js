import { apiRequest } from "../apiClient.js";

export async function listEmpleados(search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest(`/api/v1/tenant/empleados${query}`);
}

export async function getEmpleado(id) {
  return apiRequest(`/api/v1/tenant/empleados/${id}`);
}

export async function createEmpleado(payload) {
  return apiRequest("/api/v1/tenant/empleados", { method: "POST", body: payload });
}

export async function updateEmpleado(id, payload) {
  return apiRequest(`/api/v1/tenant/empleados/${id}`, { method: "PATCH", body: payload });
}

export async function deleteEmpleado(id) {
  return apiRequest(`/api/v1/tenant/empleados/${id}`, { method: "DELETE" });
}
