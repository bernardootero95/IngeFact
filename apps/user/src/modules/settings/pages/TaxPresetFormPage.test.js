import { describe, expect, it } from "vitest";
import { validateField } from "./TaxPresetFormPage.validation.js";

describe("TaxPresetFormPage validateField", () => {
  it("requiere tributo", () => {
    expect(validateField("tributo", "")).toMatch(/obligatorio/i);
    expect(validateField("tributo", "01")).toBe("");
  });

  it("valida tarifa entre 0 y 100", () => {
    expect(validateField("tarifa", "")).toMatch(/obligatoria/i);
    expect(validateField("tarifa", "no-numero")).toMatch(/entre 0 y 100/i);
    expect(validateField("tarifa", "-1")).toMatch(/entre 0 y 100/i);
    expect(validateField("tarifa", "101")).toMatch(/entre 0 y 100/i);
    expect(validateField("tarifa", "0")).toBe("");
    expect(validateField("tarifa", "19")).toBe("");
    expect(validateField("tarifa", "100")).toBe("");
  });
});
