import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../apiClient.js", () => ({
  apiRequest: (...args) => apiRequest(...args),
  apiRequestBlob: vi.fn(),
}));

import { enviarFacturaPorCorreo } from "./facturas.js";
import { enviarNotaCreditoPorCorreo } from "./notasCredito.js";
import { enviarNotaDebitoPorCorreo } from "./notasDebito.js";

describe("enviar por correo (facturas y notas)", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue(undefined);
  });

  it.each([
    ["factura", enviarFacturaPorCorreo, "/api/v1/tenant/facturas/9/enviar-correo"],
    ["nota credito", enviarNotaCreditoPorCorreo, "/api/v1/tenant/notas-credito/9/enviar-correo"],
    ["nota debito", enviarNotaDebitoPorCorreo, "/api/v1/tenant/notas-debito/9/enviar-correo"],
  ])("%s: sin correo no manda cuerpo", async (_nombre, fn, ruta) => {
    await fn("9");
    expect(apiRequest).toHaveBeenCalledWith(ruta, { method: "POST", body: undefined });
  });

  it.each([
    ["factura", enviarFacturaPorCorreo, "/api/v1/tenant/facturas/9/enviar-correo"],
    ["nota credito", enviarNotaCreditoPorCorreo, "/api/v1/tenant/notas-credito/9/enviar-correo"],
    ["nota debito", enviarNotaDebitoPorCorreo, "/api/v1/tenant/notas-debito/9/enviar-correo"],
  ])("%s: con correo lo manda en el cuerpo", async (_nombre, fn, ruta) => {
    await fn("9", "otro@example.com");
    expect(apiRequest).toHaveBeenCalledWith(ruta, { method: "POST", body: { correo: "otro@example.com" } });
  });
});
