import { describe, expect, it } from "vitest";
import { validateField } from "./SupportDocumentResolutionSettingsPage.validation.js";

const baseForm = {
  numero_resolucion: "",
  prefijo: "",
  rango_minimo: "",
  rango_maximo: "",
  fecha_inicio: "",
  fecha_fin: "",
  consecutivo_actual: "",
};

describe("SupportDocumentResolutionSettingsPage validateField", () => {
  it("requiere numero_resolucion y prefijo", () => {
    expect(validateField("numero_resolucion", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("prefijo", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("numero_resolucion", "18760000002", baseForm)).toBe("");
  });

  it("rango_minimo y rango_maximo deben ser numeros positivos", () => {
    expect(validateField("rango_minimo", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("rango_minimo", "0", baseForm)).toMatch(/mayor a 0/i);
    expect(validateField("rango_minimo", "1", baseForm)).toBe("");
  });

  it("rango_maximo debe ser mayor que rango_minimo", () => {
    const form = { ...baseForm, rango_minimo: "100", rango_maximo: "100" };
    expect(validateField("rango_maximo", "50", form)).toMatch(/mayor al rango m[ií]nimo/i);
    expect(validateField("rango_maximo", "500", form)).toBe("");
  });

  it("fecha_fin debe ser posterior a fecha_inicio", () => {
    const form = { ...baseForm, fecha_inicio: "2026-01-01", fecha_fin: "2025-12-31" };
    expect(validateField("fecha_fin", "2025-12-31", form)).toMatch(/posterior/i);
  });

  it("consecutivo_actual es opcional, pero si se llena debe ser un entero positivo dentro del rango", () => {
    expect(validateField("consecutivo_actual", "", baseForm)).toBe("");
    const form = { ...baseForm, rango_minimo: "100", rango_maximo: "500" };
    expect(validateField("consecutivo_actual", "99", form)).toMatch(/menor al rango m[ií]nimo/i);
    expect(validateField("consecutivo_actual", "250", form)).toBe("");
  });
});
