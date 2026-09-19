import { describe, expect, it } from "vitest";
import { validateFormaPago, validateMetodoPago } from "./SeccionPagoDocumentoSoporte.validation.js";

describe("SeccionPagoDocumentoSoporte validaciones", () => {
  it("requiere forma de pago", () => {
    expect(validateFormaPago("")).toMatch(/forma de pago/i);
    expect(validateFormaPago("1")).toBe("");
  });

  it("requiere metodo de pago", () => {
    expect(validateMetodoPago("")).toMatch(/m.todo de pago/i);
    expect(validateMetodoPago("10")).toBe("");
  });
});
