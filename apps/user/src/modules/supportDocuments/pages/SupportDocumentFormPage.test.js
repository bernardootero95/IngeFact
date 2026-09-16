import { describe, expect, it } from "vitest";
import { validateProveedor, validateFecha, validateLineas, calcularTotales } from "./SupportDocumentFormPage.validation.js";

describe("SupportDocumentFormPage validaciones", () => {
  it("requiere proveedor", () => {
    expect(validateProveedor(null)).toMatch(/proveedor/i);
    expect(validateProveedor("prov-1")).toBe("");
  });

  it("requiere fecha", () => {
    expect(validateFecha("")).toMatch(/obligatoria/i);
    expect(validateFecha("2026-09-15")).toBe("");
  });

  it("requiere al menos una linea con producto, cantidad y precio validos", () => {
    expect(validateLineas([])).toMatch(/agrega/i);
    expect(validateLineas([{ producto_id: "p1", cantidad: "2", precio_unitario: "100" }])).toBe("");
    expect(validateLineas([{ producto_id: "p1", cantidad: "0", precio_unitario: "100" }])).toMatch(/cantidad/i);
  });

  it("calcula subtotal, impuestos y total", () => {
    const lineas = [{ cantidad: "2", precio_unitario: "100000", producto: { tarifa_impuesto: 19 } }];
    const totales = calcularTotales(lineas);
    expect(totales.subtotal).toBe(200000);
    expect(totales.totalImpuestos).toBe(38000);
    expect(totales.total).toBe(238000);
  });
});
