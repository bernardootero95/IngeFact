import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({
  apiRequest: (...args) => apiRequest(...args),
  apiRequestBlob: vi.fn(),
}));

import { eliminarBorradorFactura, duplicarFactura } from "./facturas.js";

describe("facturas", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("eliminarBorradorFactura hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await eliminarBorradorFactura("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas/1", { method: "DELETE" });
  });

  it("duplicarFactura hace POST a /duplicar", async () => {
    apiRequest.mockResolvedValue({ id: "2" });
    await duplicarFactura("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas/1/duplicar", { method: "POST" });
  });
});
