import { describe, expect, it } from "vitest";
import {
  validateMotivo,
  validateLineaCantidad,
  validateLineasCredito,
  calcularTotalesNota,
} from "./CreditNoteFormPage.validation.js";

describe("CreditNoteFormPage validation", () => {
  it("requiere motivo", () => {
    expect(validateMotivo("")).toMatch(/selecciona un motivo/i);
    expect(validateMotivo("1")).toBe("");
  });

  it("requiere cantidad mayor a 0 y dentro de lo disponible", () => {
    expect(validateLineaCantidad("", 5)).toMatch(/mayor a 0/i);
    expect(validateLineaCantidad("0", 5)).toMatch(/mayor a 0/i);
    expect(validateLineaCantidad("6", 5)).toMatch(/no puede superar/i);
    expect(validateLineaCantidad("5", 5)).toBe("");
  });

  it("requiere al menos una linea incluida", () => {
    expect(
      validateLineasCredito([{ incluida: false, cantidad: "", disponible: 5, facturaLinea: {} }]),
    ).toMatch(/al menos una l[ií]nea/i);
  });

  it("requiere cantidades validas en las lineas incluidas", () => {
    expect(
      validateLineasCredito([{ incluida: true, cantidad: "0", disponible: 5, facturaLinea: {} }]),
    ).toMatch(/cantidades/i);
    expect(
      validateLineasCredito([{ incluida: true, cantidad: "10", disponible: 5, facturaLinea: {} }]),
    ).toMatch(/cantidades/i);
  });

  it("pasa con lineas incluidas validas", () => {
    expect(
      validateLineasCredito([{ incluida: true, cantidad: "2", disponible: 5, facturaLinea: {} }]),
    ).toBe("");
  });

  it("calcula subtotal, impuestos y total solo de las lineas incluidas", () => {
    const seleccion = [
      { incluida: true, cantidad: "2", facturaLinea: { precio_unitario: 100000, tarifa_impuesto: 19 } },
      { incluida: false, cantidad: "3", facturaLinea: { precio_unitario: 50000, tarifa_impuesto: 0 } },
    ];

    const totales = calcularTotalesNota(seleccion);

    expect(totales.subtotal).toBe(200000);
    expect(totales.totalImpuestos).toBe(38000);
    expect(totales.total).toBe(238000);
  });

  it("calcula totales en cero sin lineas incluidas", () => {
    expect(calcularTotalesNota([])).toEqual({ subtotal: 0, totalImpuestos: 0, total: 0 });
  });
});
