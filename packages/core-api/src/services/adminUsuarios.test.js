import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import { listUsuariosAdmin, crearUsuarioAdmin, actualizarUsuarioAdmin } from "./adminUsuarios.js";

describe("adminUsuarios", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listUsuariosAdmin pide el listado", async () => {
    apiRequest.mockResolvedValue([]);
    await listUsuariosAdmin();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/usuarios");
  });

  it("crearUsuarioAdmin hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await crearUsuarioAdmin({ nombre: "Ana", email: "ana@example.com" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/usuarios", {
      method: "POST",
      body: { nombre: "Ana", email: "ana@example.com" },
    });
  });

  it("actualizarUsuarioAdmin hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await actualizarUsuarioAdmin("1", { nombre: "Ana", estado: "inactivo" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/usuarios/1", {
      method: "PATCH",
      body: { nombre: "Ana", estado: "inactivo" },
    });
  });
});
