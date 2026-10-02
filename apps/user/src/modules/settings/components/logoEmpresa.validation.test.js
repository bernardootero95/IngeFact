import { describe, expect, it } from "vitest";
import { MAX_KB_LOGO, validateLogoFile } from "./logoEmpresa.validation";
import { nombreComercialVisible } from "../../../utils/nombreEmisor";

describe("validateLogoFile", () => {
  it("acepta PNG y JPG dentro del tope", () => {
    expect(validateLogoFile({ type: "image/png", size: 1024 })).toBe("");
    expect(validateLogoFile({ type: "image/jpeg", size: MAX_KB_LOGO * 1024 })).toBe("");
  });

  it("rechaza otros formatos, archivos pesados y vacío", () => {
    expect(validateLogoFile({ type: "image/svg+xml", size: 10 })).toMatch(/PNG o JPG/);
    expect(validateLogoFile({ type: "image/png", size: MAX_KB_LOGO * 1024 + 1 })).toMatch(/KB/);
    expect(validateLogoFile(null)).toMatch(/Selecciona/);
  });
});

describe("nombreComercialVisible", () => {
  it("solo devuelve el nombre comercial si difiere de la razón social", () => {
    expect(nombreComercialVisible({ nombre_comercial: "Tienda Luz", razon_social: "Luz SAS" })).toBe("Tienda Luz");
    expect(nombreComercialVisible({ nombre_comercial: " luz sas ", razon_social: "Luz SAS" })).toBeNull();
    expect(nombreComercialVisible({ nombre_comercial: null, razon_social: "Luz SAS" })).toBeNull();
  });
});
