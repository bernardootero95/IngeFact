import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listProveedores,
  getProveedor,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  consultarProveedorDian,
} from "./proveedores.js";

describe("proveedores", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listProveedores sin busqueda no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listProveedores();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/proveedores");
  });

  it("listProveedores con busqueda la codifica en la URL", async () => {
    apiRequest.mockResolvedValue([]);
    await listProveedores("Acme SAS");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/proveedores?search=Acme%20SAS");
  });

  it("getProveedor hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getProveedor("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/proveedores/1");
  });

  it("createProveedor hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await createProveedor({ nombre: "Proveedor Uno" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/proveedores", {
      method: "POST",
      body: { nombre: "Proveedor Uno" },
    });
  });

  it("updateProveedor hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await updateProveedor("1", { nombre: "Proveedor Editado" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/proveedores/1", {
      method: "PATCH",
      body: { nombre: "Proveedor Editado" },
    });
  });

  it("deleteProveedor hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await deleteProveedor("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/proveedores/1", { method: "DELETE" });
  });

  it("consultarProveedorDian codifica tipo y numero de documento", async () => {
    apiRequest.mockResolvedValue({ name: "Proveedor SAS", email: "proveedor@example.com" });
    await consultarProveedorDian("31", "900 123 456");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/tenant/proveedores/consultar-dian?tipo_identificacion=31&numero_identificacion=900%20123%20456",
    );
  });
});
