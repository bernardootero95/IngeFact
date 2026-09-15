import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import { listCompras, getCompra, createCompra, anularCompra, deleteCompra } from "./compras.js";

describe("compras", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listCompras sin filtros no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listCompras();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/compras");
  });

  it("listCompras con estado y proveedorId los agrega como query params", async () => {
    apiRequest.mockResolvedValue([]);
    await listCompras({ estado: "registrada", proveedorId: "prov-1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/compras?estado=registrada&proveedor_id=prov-1");
  });

  it("getCompra hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getCompra("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/compras/1");
  });

  it("createCompra hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await createCompra({ proveedor_id: "prov-1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/compras", {
      method: "POST",
      body: { proveedor_id: "prov-1" },
    });
  });

  it("anularCompra hace POST al recurso de anulacion", async () => {
    apiRequest.mockResolvedValue({ id: "1", estado: "anulada" });
    await anularCompra("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/compras/1/anular", { method: "POST" });
  });

  it("deleteCompra hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await deleteCompra("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/compras/1", { method: "DELETE" });
  });
});
