import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  getResolucionDocumentoSoporte,
  guardarResolucionDocumentoSoporte,
  cargarResolucionDocumentoSoporteDesdeAlegra,
  validarResolucionDocumentoSoporte,
} from "./resolucionDocumentoSoporte.js";

describe("resolucionDocumentoSoporte", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("getResolucionDocumentoSoporte hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getResolucionDocumentoSoporte();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/resolucion-documento-soporte");
  });

  it("guardarResolucionDocumentoSoporte hace PUT con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await guardarResolucionDocumentoSoporte({ numero_resolucion: "123" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/resolucion-documento-soporte", {
      method: "PUT",
      body: { numero_resolucion: "123" },
    });
  });

  it("cargarResolucionDocumentoSoporteDesdeAlegra hace GET a cargar-alegra", async () => {
    apiRequest.mockResolvedValue({ resoluciones: [] });
    await cargarResolucionDocumentoSoporteDesdeAlegra();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/resolucion-documento-soporte/cargar-alegra");
  });

  it("validarResolucionDocumentoSoporte hace POST a validar", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await validarResolucionDocumentoSoporte();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/resolucion-documento-soporte/validar", {
      method: "POST",
    });
  });
});
