import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listImpuestosEmpresa,
  getImpuestoEmpresa,
  createImpuestoEmpresa,
  updateImpuestoEmpresa,
  deleteImpuestoEmpresa,
} from "./impuestosEmpresa.js";

describe("impuestosEmpresa", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listImpuestosEmpresa hace GET a la lista", async () => {
    apiRequest.mockResolvedValue([]);
    await listImpuestosEmpresa();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/impuestos");
  });

  it("getImpuestoEmpresa hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getImpuestoEmpresa("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/impuestos/1");
  });

  it("createImpuestoEmpresa hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await createImpuestoEmpresa({ tributo: "01", tarifa: 19 });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/impuestos", {
      method: "POST",
      body: { tributo: "01", tarifa: 19 },
    });
  });

  it("updateImpuestoEmpresa hace PATCH al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await updateImpuestoEmpresa("1", { tributo: "01", tarifa: 5 });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/impuestos/1", {
      method: "PATCH",
      body: { tributo: "01", tarifa: 5 },
    });
  });

  it("deleteImpuestoEmpresa hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await deleteImpuestoEmpresa("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/impuestos/1", { method: "DELETE" });
  });
});
