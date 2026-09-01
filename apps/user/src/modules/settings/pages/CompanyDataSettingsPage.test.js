import { describe, expect, it } from "vitest";
import { validateField } from "./CompanyDataSettingsPage.validation.js";

describe("CompanyDataSettingsPage validateField", () => {
  it("nombre comercial es opcional pero limitado a 200 caracteres", () => {
    expect(validateField("nombre_comercial", "")).toBe("");
    expect(validateField("nombre_comercial", "a".repeat(200))).toBe("");
    expect(validateField("nombre_comercial", "a".repeat(201))).toMatch(/200 caracteres/i);
  });

  it("telefono es opcional pero debe tener formato valido si se envia", () => {
    expect(validateField("telefono", "")).toBe("");
    expect(validateField("telefono", "abc")).toMatch(/tel[eé]fono v[aá]lido/i);
    expect(validateField("telefono", "3001234567")).toBe("");
    expect(validateField("telefono", "+57 300 123 4567")).toBe("");
  });

  it("direccion es opcional pero limitada a 300 caracteres", () => {
    expect(validateField("direccion", "")).toBe("");
    expect(validateField("direccion", "a".repeat(301))).toMatch(/300 caracteres/i);
  });
});
