import { describe, expect, it } from "vitest";
import { validateField } from "./ResolutionSettingsPage.validation.js";

const baseForm = {
  numero_resolucion: "",
  prefijo: "",
  rango_minimo: "",
  rango_maximo: "",
  fecha_inicio: "",
  fecha_fin: "",
  technical_key: "",
};

describe("ResolutionSettingsPage validateField", () => {
  it("requiere numero_resolucion, prefijo y technical_key", () => {
    expect(validateField("numero_resolucion", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("prefijo", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("technical_key", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("numero_resolucion", "18760000001", baseForm)).toBe("");
  });

  it("rango_minimo y rango_maximo deben ser numeros positivos", () => {
    expect(validateField("rango_minimo", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("rango_minimo", "no-numero", baseForm)).toMatch(/mayor a 0/i);
    expect(validateField("rango_minimo", "0", baseForm)).toMatch(/mayor a 0/i);
    expect(validateField("rango_minimo", "1", baseForm)).toBe("");
  });

  it("rango_maximo debe ser mayor que rango_minimo (una vez ambos campos ya tienen valor)", () => {
    // La validacion cruzada compara contra el formData YA guardado (no el
    // value que se esta tipeando), asi que solo se activa cuando ambos
    // campos ya estaban llenos de antes.
    const form = { ...baseForm, rango_minimo: "100", rango_maximo: "100" };
    expect(validateField("rango_maximo", "50", form)).toMatch(/mayor al rango m[ií]nimo/i);
    expect(validateField("rango_maximo", "100", form)).toMatch(/mayor al rango m[ií]nimo/i);
    expect(validateField("rango_maximo", "500", form)).toBe("");
  });

  it("rango_minimo tambien dispara la validacion cruzada contra rango_maximo ya guardado", () => {
    const form = { ...baseForm, rango_minimo: "100", rango_maximo: "100" };
    expect(validateField("rango_minimo", "150", form)).toMatch(/mayor al rango m[ií]nimo/i);
    expect(validateField("rango_minimo", "50", form)).toBe("");
  });

  it("fecha_inicio y fecha_fin son obligatorias", () => {
    expect(validateField("fecha_inicio", "", baseForm)).toMatch(/obligatorio/i);
    expect(validateField("fecha_fin", "", baseForm)).toMatch(/obligatorio/i);
  });

  it("fecha_fin debe ser posterior a fecha_inicio", () => {
    const form = { ...baseForm, fecha_inicio: "2026-01-01", fecha_fin: "2025-12-31" };
    expect(validateField("fecha_fin", "2025-12-31", form)).toMatch(/posterior/i);

    const formValido = { ...baseForm, fecha_inicio: "2026-01-01", fecha_fin: "2026-12-31" };
    expect(validateField("fecha_fin", "2026-12-31", formValido)).toBe("");
  });
});
