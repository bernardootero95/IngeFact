import { apiRequest } from "../apiClient.js";

export async function listProductos(search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest(`/api/v1/tenant/productos${query}`);
}

export async function getProducto(id) {
  return apiRequest(`/api/v1/tenant/productos/${id}`);
}

export async function createProducto(payload) {
  return apiRequest("/api/v1/tenant/productos", { method: "POST", body: payload });
}

export async function updateProducto(id, payload) {
  return apiRequest(`/api/v1/tenant/productos/${id}`, { method: "PATCH", body: payload });
}

export async function deleteProducto(id) {
  return apiRequest(`/api/v1/tenant/productos/${id}`, { method: "DELETE" });
}
