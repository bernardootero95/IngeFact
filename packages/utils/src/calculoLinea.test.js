import { describe, expect, it } from "vitest";
import { calcularLinea, excluidoProporcional } from "./calculoLinea.js";

describe("calcularLinea", () => {
  it("sin excluido calcula el IVA sobre todo el subtotal", () => {
    expect(calcularLinea({ cantidad: 2, precio: 100000, tarifa: 19 })).toEqual({
      subtotal: 200000,
      excluido: 0,
      base: 200000,
      impuesto: 38000,
      total: 238000,
    });
  });

  it("el excluido reduce solo la base del IVA (60.000 al cliente)", () => {
    expect(calcularLinea({ cantidad: 1, precio: 51857.14, tarifa: 19, valorExcluido: 9000 })).toEqual({
      subtotal: 51857.14,
      excluido: 9000,
      base: 42857.14,
      impuesto: 8142.86,
      total: 60000,
    });
  });

  it("el excluido nunca supera el subtotal", () => {
    const linea = calcularLinea({ cantidad: 1, precio: 5000, tarifa: 19, valorExcluido: 9000 });
    expect(linea.excluido).toBe(5000);
    expect(linea.impuesto).toBe(0);
  });

  it("tolera valores vacios o no numericos", () => {
    expect(calcularLinea({ cantidad: "", precio: "abc", tarifa: undefined }).total).toBe(0);
  });
});

describe("excluidoProporcional", () => {
  it("reparte el excluido por cantidad", () => {
    expect(excluidoProporcional(18000, 2, 1)).toBe(9000);
    expect(excluidoProporcional(18000, 2, 2)).toBe(18000);
  });

  it("devuelve 0 sin cantidad de origen", () => {
    expect(excluidoProporcional(18000, 0, 1)).toBe(0);
  });
});
