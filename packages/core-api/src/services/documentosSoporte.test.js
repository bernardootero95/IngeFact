import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listDocumentosSoporte,
  getDocumentoSoporte,
  crearBorradorDocumentoSoporte,
  actualizarBorradorDocumentoSoporte,
  eliminarBorradorDocumentoSoporte,
  enviarDocumentoSoporte,
} from "./documentosSoporte.js";

describe("documentosSoporte", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listDocumentosSoporte sin filtros no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listDocumentosSoporte();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte");
  });

  it("listDocumentosSoporte con estado y proveedorId los agrega como query params", async () => {
    apiRequest.mockResolvedValue([]);
    await listDocumentosSoporte({ estado: "borrador", proveedorId: "prov-1" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/tenant/documentos-soporte?estado=borrador&proveedor_id=prov-1",
    );
  });

  it("getDocumentoSoporte hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getDocumentoSoporte("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte/1");
  });

  it("crearBorradorDocumentoSoporte hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await crearBorradorDocumentoSoporte({ proveedor_id: "prov-1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte", {
      method: "POST",
      body: { proveedor_id: "prov-1" },
    });
  });

  it("actualizarBorradorDocumentoSoporte hace PUT con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await actualizarBorradorDocumentoSoporte("1", { proveedor_id: "prov-1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte/1", {
      method: "PUT",
      body: { proveedor_id: "prov-1" },
    });
  });

  it("eliminarBorradorDocumentoSoporte hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await eliminarBorradorDocumentoSoporte("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte/1", { method: "DELETE" });
  });

  it("enviarDocumentoSoporte hace POST con forma_pago/metodo_pago", async () => {
    apiRequest.mockResolvedValue({ id: "1", estado: "aceptado" });
    await enviarDocumentoSoporte("1", { forma_pago: "1", metodo_pago: "10" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte/1/enviar", {
      method: "POST",
      body: { forma_pago: "1", metodo_pago: "10" },
    });
  });
});
