import { apiRequest } from "../apiClient.js";

export async function listClientes(search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest(`/api/v1/tenant/clientes${query}`);
}

export async function getCliente(id) {
  return apiRequest(`/api/v1/tenant/clientes/${id}`);
}

export async function createCliente(payload) {
  return apiRequest("/api/v1/tenant/clientes", { method: "POST", body: payload });
}

export async function updateCliente(id, payload) {
  return apiRequest(`/api/v1/tenant/clientes/${id}`, { method: "PATCH", body: payload });
}

export async function deleteCliente(id) {
  return apiRequest(`/api/v1/tenant/clientes/${id}`, { method: "DELETE" });
}

export async function consultarClienteDian(tipoIdentificacion, numeroIdentificacion) {
  const query = `?tipo_identificacion=${encodeURIComponent(tipoIdentificacion)}&numero_identificacion=${encodeURIComponent(numeroIdentificacion)}`;
  return apiRequest(`/api/v1/tenant/clientes/consultar-dian${query}`);
}
