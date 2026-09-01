import { describe, expect, it } from "vitest";
import {
  validateCliente,
  validateFecha,
  validateLineaCantidad,
  validateLineas,
  validateFormaPago,
  validateMetodoPago,
  calcularTotales,
} from "./InvoiceWizardPage.validation.js";

describe("InvoiceWizardPage validation", () => {
  it("requiere cliente", () => {
    expect(validateCliente(null)).toMatch(/seleccionar un cliente/i);
    expect(validateCliente("cliente-id")).toBe("");
  });

  it("requiere fecha", () => {
    expect(validateFecha("")).toMatch(/obligatoria/i);
    expect(validateFecha("2026-09-01")).toBe("");
  });

  it("requiere cantidad mayor a 0 por linea", () => {
    expect(validateLineaCantidad("")).toMatch(/mayor a 0/i);
    expect(validateLineaCantidad("0")).toMatch(/mayor a 0/i);
    expect(validateLineaCantidad("-1")).toMatch(/mayor a 0/i);
    expect(validateLineaCantidad("2")).toBe("");
  });

  it("requiere al menos una linea", () => {
    expect(validateLineas([])).toMatch(/al menos una l[ií]nea/i);
  });

  it("requiere producto seleccionado en todas las lineas", () => {
    expect(validateLineas([{ producto_id: "", cantidad: "1" }])).toMatch(/selecciona un producto/i);
  });

  it("requiere cantidades validas en todas las lineas", () => {
    expect(validateLineas([{ producto_id: "p1", cantidad: "0" }])).toMatch(/cantidades/i);
  });

  it("pasa con lineas validas", () => {
    expect(validateLineas([{ producto_id: "p1", cantidad: "2" }])).toBe("");
  });

  it("requiere forma y metodo de pago", () => {
    expect(validateFormaPago("")).toMatch(/forma de pago/i);
    expect(validateFormaPago("1")).toBe("");
    expect(validateMetodoPago("")).toMatch(/m[ée]todo de pago/i);
    expect(validateMetodoPago("10")).toBe("");
  });

  it("calcula subtotal, impuestos y total de las lineas", () => {
    const lineas = [
      { cantidad: "2", producto: { precio: 100000, tarifa_impuesto: 19 } },
      { cantidad: "1", producto: { precio: 50000, tarifa_impuesto: 0 } },
    ];

    const totales = calcularTotales(lineas);

    expect(totales.subtotal).toBe(250000);
    expect(totales.totalImpuestos).toBe(38000);
    expect(totales.total).toBe(288000);
  });

  it("calcula totales en cero sin lineas o sin producto seleccionado", () => {
    expect(calcularTotales([])).toEqual({ subtotal: 0, totalImpuestos: 0, total: 0 });
    expect(calcularTotales([{ cantidad: "1", producto: null }])).toEqual({
      subtotal: 0,
      totalImpuestos: 0,
      total: 0,
    });
  });
});
