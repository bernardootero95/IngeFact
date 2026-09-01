import { describe, expect, it } from "vitest";
import { validateField } from "./ProductFormPage.validation.js";

describe("ProductFormPage validateField", () => {
  it("requiere codigo", () => {
    expect(validateField("codigo", "")).toMatch(/obligatorio/i);
    expect(validateField("codigo", "SKU-001")).toBe("");
  });

  it("requiere nombre", () => {
    expect(validateField("nombre", "  ")).toMatch(/obligatorio/i);
    expect(validateField("nombre", "Servicio de consultoría")).toBe("");
  });

  it("valida precio numerico no negativo", () => {
    expect(validateField("precio", "")).toMatch(/obligatorio/i);
    expect(validateField("precio", "no-es-numero")).toMatch(/número/i);
    expect(validateField("precio", "-5")).toMatch(/número/i);
    expect(validateField("precio", "0")).toBe("");
    expect(validateField("precio", "15000")).toBe("");
  });

  it("requiere unidad de medida", () => {
    expect(validateField("unidad_medida", "")).toMatch(/obligatoria/i);
    expect(validateField("unidad_medida", "94")).toBe("");
  });
});
