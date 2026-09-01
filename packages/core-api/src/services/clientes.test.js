import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  consultarClienteDian,
} from "./clientes.js";

describe("clientes", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listClientes sin busqueda no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listClientes();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/clientes");
  });

  it("listClientes con busqueda la codifica en la URL", async () => {
    apiRequest.mockResolvedValue([]);
    await listClientes("Acme SAS");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/clientes?search=Acme%20SAS");
  });

  it("getCliente hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getCliente("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/clientes/1");
  });

  it("createCliente hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await createCliente({ nombre: "Cliente Uno" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/clientes", {
      method: "POST",
      body: { nombre: "Cliente Uno" },
    });
  });

  it("updateCliente hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await updateCliente("1", { nombre: "Cliente Editado" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/clientes/1", {
      method: "PATCH",
      body: { nombre: "Cliente Editado" },
    });
  });

  it("deleteCliente hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await deleteCliente("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/clientes/1", { method: "DELETE" });
  });

  it("consultarClienteDian codifica tipo y numero de documento", async () => {
    apiRequest.mockResolvedValue({ name: "Cliente SAS", email: "cliente@example.com" });
    await consultarClienteDian("31", "900 123 456");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/tenant/clientes/consultar-dian?tipo_identificacion=31&numero_identificacion=900%20123%20456",
    );
  });
});
