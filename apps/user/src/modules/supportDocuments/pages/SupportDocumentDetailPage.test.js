import { describe, expect, it } from "vitest";
import { validateFormaPago, validateMetodoPago } from "./SupportDocumentDetailPage.validation.js";

describe("SupportDocumentDetailPage validaciones", () => {
  it("requiere forma de pago", () => {
    expect(validateFormaPago("")).toMatch(/forma de pago/i);
    expect(validateFormaPago("1")).toBe("");
  });

  it("requiere metodo de pago", () => {
    expect(validateMetodoPago("")).toMatch(/m.todo de pago/i);
    expect(validateMetodoPago("10")).toBe("");
  });
});
