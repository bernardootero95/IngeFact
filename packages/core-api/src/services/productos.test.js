import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import { listProductos, getProducto, createProducto, updateProducto, deleteProducto } from "./productos.js";

describe("productos", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listProductos sin busqueda no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listProductos();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/productos");
  });

  it("listProductos con busqueda la codifica en la URL", async () => {
    apiRequest.mockResolvedValue([]);
    await listProductos("Asesoria contable");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/productos?search=Asesoria%20contable");
  });

  it("getProducto hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getProducto("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/productos/1");
  });

  it("createProducto hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await createProducto({ nombre: "Producto Uno" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/productos", {
      method: "POST",
      body: { nombre: "Producto Uno" },
    });
  });

  it("updateProducto hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await updateProducto("1", { nombre: "Producto Editado" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/productos/1", {
      method: "PATCH",
      body: { nombre: "Producto Editado" },
    });
  });

  it("deleteProducto hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await deleteProducto("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/productos/1", { method: "DELETE" });
  });
});
