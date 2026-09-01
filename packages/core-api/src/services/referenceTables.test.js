import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listReferenceTable,
  listPublicReferenceTable,
  crearReferenceRecord,
  actualizarReferenceRecord,
  sincronizarReferenceTable,
} from "./referenceTables.js";

describe("referenceTables", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listReferenceTable sin busqueda no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listReferenceTable("departamentos");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/reference-tables/departamentos");
  });

  it("listReferenceTable con busqueda la codifica en la URL", async () => {
    apiRequest.mockResolvedValue([]);
    await listReferenceTable("departamentos", "Bogotá");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/reference-tables/departamentos?search=Bogot%C3%A1");
  });

  it("listPublicReferenceTable llama el endpoint publico sin guard", async () => {
    apiRequest.mockResolvedValue([]);
    await listPublicReferenceTable("tipos_identificacion");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/public/reference-tables/tipos_identificacion");
  });

  it("crearReferenceRecord hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await crearReferenceRecord("departamentos", { code: "11", value: "Bogotá" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/reference-tables/departamentos", {
      method: "POST",
      body: { code: "11", value: "Bogotá" },
    });
  });

  it("actualizarReferenceRecord hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await actualizarReferenceRecord("departamentos", "1", { code: "11", value: "Bogotá" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/reference-tables/departamentos/1", {
      method: "PATCH",
      body: { code: "11", value: "Bogotá" },
    });
  });

  it("sincronizarReferenceTable hace POST a /sync", async () => {
    apiRequest.mockResolvedValue({ success: true, processed: 33 });
    await sincronizarReferenceTable("departamentos");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/reference-tables/departamentos/sync", {
      method: "POST",
    });
  });
});
