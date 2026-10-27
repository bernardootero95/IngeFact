import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({ apiRequest: (...args) => apiRequest(...args) }));

import {
  listFacturasRecibidas,
  getFacturaRecibida,
  consultarFacturaRecibida,
  obtenerXmlFacturaRecibida,
  crearFacturaRecibida,
  eliminarFacturaRecibida,
  registrarEventoReceptor,
  validarEventoMasivo,
  emitirEventoMasivo,
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

  it("consultarFacturaRecibida codifica el CUFE en el query string", async () => {
    apiRequest.mockResolvedValue({});
    await consultarFacturaRecibida("abc 123");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas/consulta?cufe=abc%20123");
  });

  it("obtenerXmlFacturaRecibida hace GET a /xml", async () => {
    apiRequest.mockResolvedValue({});
    await obtenerXmlFacturaRecibida("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas/1/xml");
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

  it("validarEventoMasivo hace POST con los criterios", async () => {
    apiRequest.mockResolvedValue({ cantidad: 0 });
    const criterios = { fecha_desde: "2026-09-01", fecha_hasta: "2026-09-30", tipo: "030" };
    await validarEventoMasivo(criterios);
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas/eventos-masivos/validar", {
      method: "POST",
      body: criterios,
    });
  });

  it("emitirEventoMasivo hace POST con la tanda", async () => {
    apiRequest.mockResolvedValue([]);
    await emitirEventoMasivo({ factura_ids: ["1"] });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/facturas-recibidas/eventos-masivos/emitir", {
      method: "POST",
      body: { factura_ids: ["1"] },
    });
  });
});
