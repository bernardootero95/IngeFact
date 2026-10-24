import { describe, expect, it } from "vitest";
import {
  contarResultados,
  partirEnLotes,
  plural,
  resultadosDeLoteFallido,
  validateReporteFile,
} from "./cargaMasiva.js";

describe("carga masiva de facturas recibidas", () => {
  it("valida el archivo del reporte", () => {
    expect(validateReporteFile(null)).toMatch(/elige/i);
    expect(validateReporteFile({ name: "reporte.csv", size: 10 })).toMatch(/xlsx/i);
    expect(validateReporteFile({ name: "Reporte.XLSX", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(validateReporteFile({ name: "reporte.xlsx", size: 1024 })).toBe("");
  });

  it("parte los CUFE en lotes", () => {
    expect(partirEnLotes([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(partirEnLotes([], 3)).toEqual([]);
  });

  it("cuenta los resultados por tipo", () => {
    const conteo = contarResultados([{ resultado: "cargada" }, { resultado: "error" }, { resultado: "cargada" }]);
    expect(conteo).toEqual({ cargada: 2, omitida: 0, error: 1 });
  });

  it("marca como error todo un lote que falló", () => {
    expect(resultadosDeLoteFallido(["a", "b"], "Sin conexión")).toEqual([
      { cufe: "a", resultado: "error", mensaje: "Sin conexión", factura: null },
      { cufe: "b", resultado: "error", mensaje: "Sin conexión", factura: null },
    ]);
  });

  it("pluraliza", () => {
    expect(plural(1, "factura", "facturas")).toBe("1 factura");
    expect(plural(3, "factura", "facturas")).toBe("3 facturas");
  });
});
