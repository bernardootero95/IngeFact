import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import { enviarSetPruebas, getHabilitacionesDian } from "./habilitacionDian.js";

describe("habilitacionDian", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("getHabilitacionesDian hace GET al recurso", async () => {
    apiRequest.mockResolvedValue([]);
    await getHabilitacionesDian();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/habilitacion");
  });

  it("enviarSetPruebas hace POST al tipo con el TestSetId", async () => {
    apiRequest.mockResolvedValue({ tipo: "nomina" });
    await enviarSetPruebas("nomina", "a70562e0-631e-4ceb-aa65-36887b57dc17");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/habilitacion/nomina/set-pruebas", {
      method: "POST",
      body: { test_set_id: "a70562e0-631e-4ceb-aa65-36887b57dc17" },
    });
  });
});
