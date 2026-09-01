import { describe, expect, it } from "vitest";
import { validateField } from "./CustomerFormPage.validation.js";

describe("CustomerFormPage validateField", () => {
  it("requiere tipo de identificacion", () => {
    expect(validateField("tipo_identificacion", "")).toMatch(/obligatorio/i);
    expect(validateField("tipo_identificacion", "CC")).toBe("");
  });

  it("requiere numero de identificacion", () => {
    expect(validateField("numero_identificacion", "  ")).toMatch(/obligatoria/i);
    expect(validateField("numero_identificacion", "900123456")).toBe("");
  });

  it("requiere nombre", () => {
    expect(validateField("nombre", "")).toMatch(/obligatorio/i);
    expect(validateField("nombre", "IngeFact S.A.S.")).toBe("");
  });

  it("valida formato de correo", () => {
    expect(validateField("correo_electronico", "")).toMatch(/obligatorio/i);
    expect(validateField("correo_electronico", "no-es-un-correo")).toMatch(/inv[aá]lido/i);
    expect(validateField("correo_electronico", "facturacion@cliente.com")).toBe("");
  });

  it("no valida campos sin regla (telefono, tipo_organizacion, etc.)", () => {
    expect(validateField("telefono", "")).toBe("");
    expect(validateField("campo_desconocido", "cualquier valor")).toBe("");
  });

  it("requiere regimen fiscal", () => {
    expect(validateField("regimen_fiscal", "")).toMatch(/obligatorio/i);
    expect(validateField("regimen_fiscal", "48")).toBe("");
    expect(validateField("regimen_fiscal", "49")).toBe("");
  });
});
