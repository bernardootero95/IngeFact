import { apiRequest } from "../apiClient.js";

export async function listProveedores(search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest(`/api/v1/tenant/proveedores${query}`);
}

export async function getProveedor(id) {
  return apiRequest(`/api/v1/tenant/proveedores/${id}`);
}

export async function createProveedor(payload) {
  return apiRequest("/api/v1/tenant/proveedores", { method: "POST", body: payload });
}

export async function updateProveedor(id, payload) {
  return apiRequest(`/api/v1/tenant/proveedores/${id}`, { method: "PATCH", body: payload });
}

export async function deleteProveedor(id) {
  return apiRequest(`/api/v1/tenant/proveedores/${id}`, { method: "DELETE" });
}

export async function consultarProveedorDian(tipoIdentificacion, numeroIdentificacion) {
  const query = `?tipo_identificacion=${encodeURIComponent(tipoIdentificacion)}&numero_identificacion=${encodeURIComponent(numeroIdentificacion)}`;
  return apiRequest(`/api/v1/tenant/proveedores/consultar-dian${query}`);
}
