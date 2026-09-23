import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
const apiRequestBlob = vi.fn();
vi.mock("../apiClient.js", () => ({
  apiRequest: (...args) => apiRequest(...args),
  apiRequestBlob: (...args) => apiRequestBlob(...args),
}));

import {
  listNomina,
  getNomina,
  crearBorradorNomina,
  actualizarBorradorNomina,
  eliminarBorradorNomina,
  enviarNomina,
  anularNomina,
  enviarNominaPorCorreo,
  obtenerUrlXmlNomina,
  obtenerRepresentacionPdfNomina,
} from "./nomina.js";

describe("nomina", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequestBlob.mockReset();
  });

  it("listNomina sin filtro no agrega query string", async () => {
    apiRequest.mockResolvedValue([]);
    await listNomina();
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina");
  });

  it("listNomina con empleadoId lo agrega como query param", async () => {
    apiRequest.mockResolvedValue([]);
    await listNomina("emp-1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina?empleado_id=emp-1");
  });

  it("getNomina hace GET al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await getNomina("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1");
  });

  it("crearBorradorNomina hace POST con el payload", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await crearBorradorNomina({ empleado_id: "emp-1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina", {
      method: "POST",
      body: { empleado_id: "emp-1" },
    });
  });

  it("actualizarBorradorNomina hace PUT al recurso", async () => {
    apiRequest.mockResolvedValue({ id: "1" });
    await actualizarBorradorNomina("1", { empleado_id: "emp-1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1", {
      method: "PUT",
      body: { empleado_id: "emp-1" },
    });
  });

  it("eliminarBorradorNomina hace DELETE al recurso", async () => {
    apiRequest.mockResolvedValue(null);
    await eliminarBorradorNomina("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1", { method: "DELETE" });
  });

  it("enviarNomina hace POST a /enviar", async () => {
    apiRequest.mockResolvedValue({ id: "1", estado: "aceptada" });
    await enviarNomina("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1/enviar", { method: "POST" });
  });

  it("anularNomina hace POST a /anular", async () => {
    apiRequest.mockResolvedValue({ id: "1", estado: "anulada" });
    await anularNomina("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1/anular", { method: "POST" });
  });

  it("enviarNominaPorCorreo sin correo no manda body", async () => {
    apiRequest.mockResolvedValue(null);
    await enviarNominaPorCorreo("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1/enviar-correo", {
      method: "POST",
      body: undefined,
    });
  });

  it("enviarNominaPorCorreo con correo lo manda en el body", async () => {
    apiRequest.mockResolvedValue(null);
    await enviarNominaPorCorreo("1", "empleado@example.com");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1/enviar-correo", {
      method: "POST",
      body: { correo: "empleado@example.com" },
    });
  });

  it("obtenerUrlXmlNomina hace GET a /xml", async () => {
    apiRequest.mockResolvedValue({ url: "https://s3.example.com/x.xml" });
    await obtenerUrlXmlNomina("1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/tenant/nomina/1/xml");
  });

  it("obtenerRepresentacionPdfNomina pide un blob", async () => {
    apiRequestBlob.mockResolvedValue(new Blob());
    await obtenerRepresentacionPdfNomina("1");
    expect(apiRequestBlob).toHaveBeenCalledWith("/api/v1/tenant/nomina/1/representacion.pdf");
  });
});
