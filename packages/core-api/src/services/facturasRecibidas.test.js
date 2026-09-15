import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listFacturasRecibidas,
  getFacturaRecibida,
  crearFacturaRecibida,
  eliminarFacturaRecibida,
  registrarEventoReceptor,
} from "./facturasRecibidas.js";

describe("facturasRecibidas", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("listFacturasRecibidas sin filtro no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listFacturasRecibidas();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas");
  });

  it("listFacturasRecibidas con proveedorId lo agrega como query param", async () => {
    apiRequest.mockResolvedValue([]);
    await listFacturasRecibidas({ proveedorId: "prov-1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas?proveedor_id=prov-1");
  });

  it("getFacturaRecibida hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getFacturaRecibida("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas/1");
  });

  it("crearFacturaRecibida hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await crearFacturaRecibida({ cufe: "abc" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas", {
      method: "POST",
      body: { cufe: "abc" },
    });
  });

  it("eliminarFacturaRecibida hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await eliminarFacturaRecibida("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas/1", { method: "DELETE" });
  });

  it("registrarEventoReceptor hace POST al sub-recurso de eventos", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await registrarEventoReceptor("1", { tipo: "034" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas/1/eventos", {
      method: "POST",
      body: { tipo: "034" },
    });
  });
});
