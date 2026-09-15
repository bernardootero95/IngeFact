import { describe, expect, it } from "vitest";
import { validateField } from "./SupplierFormPage.validation.js";

describe("SupplierFormPage validateField", () => {
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
    expect(validateField("nombre", "Papelería Nacional S.A.S.")).toBe("");
  });

  it("valida formato de correo", () => {
    expect(validateField("correo_electronico", "")).toMatch(/obligatorio/i);
    expect(validateField("correo_electronico", "no-es-un-correo")).toMatch(/inv[aá]lido/i);
    expect(validateField("correo_electronico", "contacto@proveedor.com")).toBe("");
  });

  it("no valida campos sin regla (telefono, campo desconocido)", () => {
    expect(validateField("telefono", "")).toBe("");
    expect(validateField("campo_desconocido", "cualquier valor")).toBe("");
  });

  it("requiere digito de verificacion solo cuando el tipo es NIT (31)", () => {
    expect(validateField("digito_verificacion", "", { tipo_identificacion: "31" })).toMatch(/obligatorio/i);
    expect(validateField("digito_verificacion", "8", { tipo_identificacion: "31" })).toBe("");
    expect(validateField("digito_verificacion", "", { tipo_identificacion: "13" })).toBe("");
  });
});
