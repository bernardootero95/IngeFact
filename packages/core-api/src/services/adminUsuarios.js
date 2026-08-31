import { apiRequest } from "../apiClient.js";

export async function listUsuariosAdmin() {
  return apiRequest("/api/v1/admin/usuarios");
}

export async function crearUsuarioAdmin(payload) {
  return apiRequest("/api/v1/admin/usuarios", { method: "POST", body: payload });
}

export async function actualizarUsuarioAdmin(id, payload) {
  return apiRequest(`/api/v1/admin/usuarios/${id}`, { method: "PATCH", body: payload });
}
