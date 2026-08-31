import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listEmpresas,
  getEmpresa,
  crearEmpresa,
  actualizarEmpresa,
  cambiarPlanEmpresa,
  sincronizarEmpresasAlegra,
} from "./adminEmpresas.js";

describe("adminEmpresas", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listEmpresas arma el query string solo con los filtros presentes", async () => {
    apiRequest.mockResolvedValue([]);
    await listEmpresas({ estado: "activo" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/empresas?estado=activo");
  });

  it("listEmpresas sin filtros no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listEmpresas();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/empresas");
  });

  it("getEmpresa pide el detalle por id", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getEmpresa("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/empresas/1");
  });

  it("crearEmpresa hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await crearEmpresa({ razon_social: "Acme" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/empresas", { method: "POST", body: { razon_social: "Acme" } });
  });

  it("actualizarEmpresa hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await actualizarEmpresa("1", { razon_social: "Acme" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/empresas/1", {
      method: "PATCH",
      body: { razon_social: "Acme" },
    });
  });

  it("cambiarPlanEmpresa hace PATCH al subrecurso /plan", async () => {
    apiRequest.mockResolvedValue({ max_documentos: 100 });
    await cambiarPlanEmpresa("1", { max_documentos: 100 });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/empresas/1/plan", {
      method: "PATCH",
      body: { max_documentos: 100 },
    });
  });

  it("sincronizarEmpresasAlegra hace POST sin body", async () => {
    apiRequest.mockResolvedValue({ success: true, processed: 3 });
    await sincronizarEmpresasAlegra();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/empresas/sync-alegra", { method: "POST" });
  });
});
