import { describe, expect, it } from "vitest";
import { validateProveedor, validateFecha, validateLineas, calcularTotales } from "./PurchaseFormPage.validation.js";

describe("PurchaseFormPage validaciones", () => {
  it("requiere proveedor", () => {
    expect(validateProveedor(null)).toMatch(/proveedor/i);
    expect(validateProveedor("prov-1")).toBe("");
  });

  it("requiere fecha", () => {
    expect(validateFecha("")).toMatch(/obligatoria/i);
    expect(validateFecha("2026-09-15")).toBe("");
  });

  it("requiere al menos una linea", () => {
    expect(validateLineas([])).toMatch(/al menos una l[ií]nea/i);
  });

  it("requiere producto en todas las lineas", () => {
    const lineas = [{ producto_id: "", cantidad: "1", precio_unitario: "100" }];
    expect(validateLineas(lineas)).toMatch(/selecciona un producto/i);
  });

  it("requiere cantidades mayores a 0", () => {
    const lineas = [{ producto_id: "p1", cantidad: "0", precio_unitario: "100" }];
    expect(validateLineas(lineas)).toMatch(/cantidades/i);
  });

  it("requiere precios mayores a 0", () => {
    const lineas = [{ producto_id: "p1", cantidad: "1", precio_unitario: "0" }];
    expect(validateLineas(lineas)).toMatch(/precios/i);
  });

  it("pasa con lineas validas", () => {
    const lineas = [{ producto_id: "p1", cantidad: "2", precio_unitario: "100" }];
    expect(validateLineas(lineas)).toBe("");
  });

  it("calcula totales sumando subtotal e impuestos de cada linea", () => {
    const lineas = [
      { cantidad: "2", precio_unitario: "100000", producto: { tarifa_impuesto: 19 } },
      { cantidad: "1", precio_unitario: "50000", producto: { tarifa_impuesto: 0 } },
    ];
    const totales = calcularTotales(lineas);
    expect(totales.subtotal).toBe(250000);
    expect(totales.totalImpuestos).toBe(38000);
    expect(totales.total).toBe(288000);
  });
});
