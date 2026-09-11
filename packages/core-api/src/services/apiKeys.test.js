import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import { listApiKeys, crearApiKey, revocarApiKey } from "./apiKeys.js";

describe("apiKeys", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listApiKeys pide las keys de la empresa", async () => {
    apiRequest.mockResolvedValue([]);
    await listApiKeys("empresa-1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/empresas/empresa-1/api-keys");
  });

  it("crearApiKey hace POST con el nombre", async () => {
    apiRequest.mockResolvedValue({ id: "key-1", api_key: "ingf_secreto" });
    await crearApiKey("empresa-1", "Integracion X");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/empresas/empresa-1/api-keys", {
      method: "POST",
      body: { nombre: "Integracion X" },
    });
  });

  it("revocarApiKey hace DELETE al subrecurso", async () => {
    apiRequest.mockResolvedValue(undefined);
    await revocarApiKey("empresa-1", "key-1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/empresas/empresa-1/api-keys/key-1", { method: "DELETE" });
  });
});
