import { describe, expect, it } from "vitest";
import {
  contarResultadosEvento,
  criteriosPayload,
  hayErrores,
  normalizarNit,
  partirEnTandas,
  resultadosDeTandaFallida,
  tandaPayload,
  validarCriterios,
  validarEmision,
  validateFechaHasta,
  validateGeneradorMasivo,
  validateProveedorNit,
  validateTipoMasivo,
} from "./eventoMasivo.js";

const GENERADOR = {
  tipo_identificacion: "13",
  numero_identificacion: " 1000000000 ",
  dv: "",
  nombres: "Ana",
  apellidos: "Pérez",
  cargo: "Contadora",
};

describe("evento en bloque: validaciones", () => {
  it("exige ambas fechas y que la final no sea anterior", () => {
    const errores = validarCriterios({ fecha_desde: "", fecha_hasta: "", proveedor_nit: "", tipo: "030" });
    expect(errores.fecha_desde).toMatch(/inicial/);
    expect(errores.fecha_hasta).toMatch(/final/);
    expect(validateFechaHasta("2026-09-01", "2026-09-30")).toMatch(/anterior/);
    expect(validateFechaHasta("2026-09-30", "2026-09-01")).toBe("");
  });

  it("el NIT es opcional, acepta puntos y DV, y rechaza letras", () => {
    expect(validateProveedorNit("")).toBe("");
    expect(validateProveedorNit("800.123.456-7")).toBe("");
    expect(validateProveedorNit("80A123")).toMatch(/número/);
    expect(validateProveedorNit("123")).toMatch(/5 y 15/);
    expect(normalizarNit(" 800.123.456-7 ")).toBe("800123456");
  });

  it("solo ofrece los eventos que el receptor puede aplicar", () => {
    expect(validateTipoMasivo("")).toMatch(/selecciona/i);
    expect(validateTipoMasivo("034")).toMatch(/selecciona/i);
    expect(validateTipoMasivo("033")).toBe("");
  });

  it("pide todos los datos de quien realiza el evento, incluido el cargo", () => {
    expect(validateGeneradorMasivo("cargo", "")).toMatch(/obligatorio/);
    expect(validateGeneradorMasivo("nombres", " ")).toMatch(/obligatorio/);
    expect(hayErrores(validarEmision({ tipo: "030" }, GENERADOR, ""))).toBe(false);
    expect(hayErrores(validarEmision({ tipo: "030" }, { ...GENERADOR, cargo: "" }, ""))).toBe(true);
  });

  it("el reclamo exige motivo", () => {
    expect(validarEmision({ tipo: "031" }, GENERADOR, "").claim_code).toMatch(/motivo/);
    expect(validarEmision({ tipo: "031" }, GENERADOR, "02").claim_code).toBe("");
  });
});

describe("evento en bloque: payloads y resultados", () => {
  const criterios = { fecha_desde: "2026-09-01", fecha_hasta: "2026-09-30", proveedor_nit: " ", tipo: "031" };

  it("sin NIT envia null", () => {
    expect(criteriosPayload(criterios).proveedor_nit).toBeNull();
  });

  it("la tanda lleva criterios, ids, firmante limpio y motivo del reclamo", () => {
    const payload = tandaPayload(criterios, ["a", "b"], GENERADOR, "02", "  ");
    expect(payload.factura_ids).toEqual(["a", "b"]);
    expect(payload.generador.numero_identificacion).toBe("1000000000");
    expect(payload.generador.dv).toBeNull();
    expect(payload.claim_code).toBe("02");
    expect(payload.notas).toBeNull();
    expect(tandaPayload({ ...criterios, tipo: "030" }, ["a"], GENERADOR, "02", "x").claim_code).toBeUndefined();
  });

  it("parte en tandas y cuenta resultados", () => {
    expect(partirEnTandas([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([[1, 2, 3, 4, 5], [6, 7]]);
    const fallidas = resultadosDeTandaFallida([{ id: "1", numero: "F1", proveedor_nombre: "P" }], "Sin conexión");
    expect(fallidas[0]).toMatchObject({ factura_id: "1", resultado: "fallido", mensaje: "Sin conexión" });
    expect(contarResultadosEvento([...fallidas, { resultado: "aceptado" }])).toEqual({ aceptado: 1, fallido: 1 });
  });
});
