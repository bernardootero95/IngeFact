import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
const apiRequestBlob = vi.fn();
vi.mock("../apiClient.js", () => ({
  apiRequest: (...args) => apiRequest(...args),
  apiRequestBlob: (...args) => apiRequestBlob(...args),
}));

import {
  listDocumentosSoporte,
  getDocumentoSoporte,
  crearBorradorDocumentoSoporte,
  actualizarBorradorDocumentoSoporte,
  eliminarBorradorDocumentoSoporte,
  enviarDocumentoSoporte,
  obtenerFirmaDigitalDocumentoSoporte,
  obtenerRepresentacionPdfDocumentoSoporte,
  enviarDocumentoSoportePorCorreo,
} from "./documentosSoporte.js";

describe("documentosSoporte", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequestBlob.mockReset();
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

  it("obtenerFirmaDigitalDocumentoSoporte hace GET a la firma", async () => {
    apiRequest.mockResolvedValue({ firma_digital: "abc" });
    await obtenerFirmaDigitalDocumentoSoporte("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte/1/firma-digital");
  });

  it("obtenerRepresentacionPdfDocumentoSoporte pide el PDF como blob", async () => {
    apiRequestBlob.mockResolvedValue(new Blob());
    await obtenerRepresentacionPdfDocumentoSoporte("1");
    expect(apiRequestBlob).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte/1/representacion.pdf");
  });

  it("enviarDocumentoSoportePorCorreo hace POST al recurso", async () => {
    apiRequest.mockResolvedValue(undefined);
    await enviarDocumentoSoportePorCorreo("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/documentos-soporte/1/enviar-correo", {
      method: "POST",
    });
  });
});
