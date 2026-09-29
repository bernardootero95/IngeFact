import { describe, expect, it } from "vitest";
import { calcularCosto, calcularPrecio, calcularResultado, precioFactoa, sumaPorTramos } from "./pricingCalculator";

describe("calcularPrecio", () => {
  // Precios publicados en apps/landing/src/data/pricing.ts.
  it.each([
    [10, 20000],
    [25, 46000],
    [50, 92000],
    [150, 142000],
    [500, 317000],
    [1500, 650000],
    [5000, 1350000],
  ])("con los parámetros por defecto, %i documentos valen %i como en la landing", (documentos, precio) => {
    expect(calcularPrecio(documentos).precio).toBe(precio);
  });

  it("aplica el precio mínimo en lugar del antiguo plan gratis", () => {
    expect(calcularPrecio(1).precio).toBe(20000);
    expect(calcularPrecio(5).lineas.some((l) => l.concepto === "Precio mínimo")).toBe(true);
  });

  it("devuelve 0 sin documentos", () => {
    expect(calcularPrecio(0).precio).toBe(0);
  });
});

describe("costos del proveedor", () => {
  it("cobra $14 por documento desde el primero sobre el promedio mensual", () => {
    const costo = calcularCosto(1200);
    expect(costo.promedioMes).toBe(100);
    expect(costo.costoMes).toBe(1400);
    expect(costo.costoAnual).toBe(16800);
  });

  it("aplica las tarifas menores al superar cada umbral mensual", () => {
    const tramos = [
      { desde: 0, tarifa: 14 },
      { desde: 200000, tarifa: 10 },
    ];
    expect(sumaPorTramos(200010, tramos).total).toBe(200000 * 14 + 10 * 10);
  });
});

describe("calcularResultado", () => {
  it("descuenta comisión y costo del proveedor para el neto", () => {
    const r = calcularResultado(1200);
    expect(r.neto).toBeCloseTo(r.precio - r.precio * 0.1 - 16800);
  });

  it("calcula cuántos paquetes cubren la mensualidad anual del proveedor", () => {
    const r = calcularResultado(150);
    expect(r.paquetesParaCubrirMensualidad).toBe(Math.ceil(1440000 / r.neto));
  });
});

describe("precioFactoa", () => {
  it("no tiene dato por debajo de su plan mínimo", () => {
    expect(precioFactoa(10)).toBeNull();
  });

  it("interpola entre dos planes y extrapola después del más grande", () => {
    expect(precioFactoa(30).precio).toBeCloseTo(70500);
    expect(precioFactoa(20000).extrapolado).toBe(true);
  });
});
